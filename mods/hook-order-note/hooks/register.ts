import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Stack = boolean

// Read once per module load: the stack does not change mid-session.
const cache: { stack: Stack | undefined } = { stack: undefined }

const detect = async ($: EngineInterface): Promise<Stack> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)
  let deps = new Set<string>()

  try {
    const parsed = JSON.parse(typeof manifest === 'string' ? manifest : '{}') as Record<string, object | undefined>
    deps = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
  } catch {
    // Invalid package.json: no stack detected.
  }

  return stackOf(deps)
}

const stackOf = (deps: Set<string>): Stack => deps.has('react')

const active = (stack: Stack): boolean => stack

const SOURCE = /\.[jt]sx$/i

type Finding = { key: string; detail: string }

// Index of the bracket that closes the one opened at `open`; -1 when it never closes.
const closing = (text: string, open: number): number => {
  const pair: Record<string, string> = { '(': ')', '{': '}', '[': ']' }
  const opener = text.charAt(open)
  const closer = pair[opener]
  let depth = 0

  for (let at = open; at < text.length; at += 1) {
    const char = text.charAt(at)

    if (char === opener) {
      depth += 1
    } else if (char === closer) {
      depth -= 1

      if (depth === 0) {
        return at
      }
    }
  }

  return -1
}

// Comments and string contents blanked, and destructured parameters collapsed, so their braces are not read as blocks.
const stripped = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
    .replace(/(?<!:)\/\/[^\n]*/g, '')
    .replace(/\(\s*\{[^{}]*\}/g, '(_props')
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''")

type Frame = { kind: 'cond' | 'fn' | 'other'; why: string; returned: boolean }

const HOOK = /(?:(?<![\w$.])|(?<=\bReact\.))(use[A-Z]\w*)\s*\(/g
const LOOP_CALL = /\.(?:map|forEach|filter|reduce|flatMap|some|every|find)\s*\(/

const frameFor = (header: string): Frame => {
  const lead = /^\s*(?:\}\s*)?(?:else\s+)?(if|for|while|do|switch|case|default|else)\b/.exec(header)?.[1]

  if (lead !== undefined) {
    return { kind: 'cond', why: lead === 'for' || lead === 'while' || lead === 'do' ? 'in a loop' : 'inside a condition', returned: false }
  }

  if (/=>|\bfunction\b/.test(header)) {
    return { kind: 'fn', why: LOOP_CALL.test(header) ? 'in a loop callback' : '', returned: false }
  }

  return { kind: 'other', why: '', returned: false }
}

// The text of the line since the last brace or semicolon: where an unbraced `if` body would still show.
const tailOf = (before: string): string => before.slice(Math.max(before.lastIndexOf('{'), before.lastIndexOf('}'), before.lastIndexOf(';')) + 1)

const findingsIn = (_stack: Stack, text: string): Finding[] => {
  const found: Finding[] = []
  const stack: Frame[] = []
  let previous = ''

  for (const line of stripped(text).split('\n')) {
    const events: { at: number; hook: string | undefined }[] = [
      ...[...line.matchAll(HOOK)].map(match => ({ at: match.index, hook: match[1] })),
      ...[...line.matchAll(/\breturn\b/g)].map(match => ({ at: match.index, hook: undefined })),
    ].sort((a, b) => a.at - b.at)
    let next = 0

    for (let at = 0; at <= line.length; at += 1) {
      while (events[next]?.at === at) {
        const event = events[next]
        const before = line.slice(0, at)
        const tail = tailOf(before)
        const unbraced = /^\s*(?:else\s+)?(?:if|while|for)\b/.test(tail) || /^\s*else\b/.test(tail) || /(?:&&|\|\||\?\?|\?)\s*$/.test(before)
        let condSeen = unbraced
        let why = unbraced ? 'inside a condition' : ''

        for (let level = stack.length - 1; level >= 0; level -= 1) {
          const frame = stack[level]

          if (frame?.kind === 'cond') {
            condSeen = true
            why = why === '' ? frame.why : why
          } else if (frame?.kind === 'fn') {
            if (event?.hook === undefined) {
              frame.returned ||= condSeen
            } else if (frame.why !== '') {
              why = why === '' ? frame.why : why
            } else if (frame.returned && why === '') {
              why = 'after an early return'
            }

            break
          }
        }

        if (event?.hook !== undefined && !/\bfunction\s+$/.test(before) && why !== '') {
          found.push({ key: `${event.hook}:${why}`, detail: `${event.hook} ${why}` })
        }

        next += 1
      }

      const char = line.charAt(at)

      if (char === '{') {
        const prefix = line.slice(0, at)
        const header = tailOf(prefix).trim() === '' ? previous : tailOf(prefix)
        stack.push(frameFor(header))
      } else if (char === '}') {
        stack.pop()
      }
    }

    if (line.trim() !== '') {
      previous = line
    }
  }

  return found
}

// What the edit adds: findings the file did not already have, matched by count.
const addedBy = (stack: Stack, before: string, after: string): Finding[] => {
  const had = new Map<string, number>()

  for (const found of findingsIn(stack, before)) {
    had.set(found.key, (had.get(found.key) ?? 0) + 1)
  }

  return findingsIn(stack, after).filter(found => {
    const left = had.get(found.key) ?? 0

    if (left > 0) {
      had.set(found.key, left - 1)

      return false
    }

    return true
  })
}

const note = (found: Finding[], path: string): string =>
  `hook-order-note: ${path} now calls ${[...new Set(found.map(item => item.detail))].join(', ')}. React identifies hooks by call order, so every hook must run on every render in the same order: never inside a condition, a loop, a nested callback or after an early return. Move the call to the top level of the component, before any return, and put the condition inside the hook or in the code that uses its result.`

const relative = async ($: EngineInterface, path: string): Promise<string> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? slashed.slice(root.length + 1) : slashed
}

// The note for the model about what the edit added; undefined when it added nothing worth a note.
const judge = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  cache.stack ??= await detect($)

  if (!active(cache.stack)) {
    return undefined
  }

  const found = addedBy(cache.stack, before, after)
  const first = found[0]

  if (first === undefined) {
    return undefined
  }

  const shown = await relative($, path)
  $.ui.toast((await strings($)).told(first.detail, shown), { timeoutMs: 5000 })

  return note(found, shown)
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    if (!SOURCE.test(e.file_path)) {
      return next(e)
    }

    const current = await $.fs.read(e.file_path).catch(() => undefined)
    const ran = await next(e)

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const text = await judge($, e.file_path, typeof current === 'string' ? current : '', e.content)

    return text === undefined ? ran : { ...ran, context: [...(ran.context ?? []), text] }
  }).catch((_$, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    if (!SOURCE.test(e.file_path)) {
      return next(e)
    }

    const current = await $.fs.read(e.file_path).catch(() => undefined)
    const ran = await next(e)

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const before = typeof current === 'string' ? current : e.old_string
    const after =
      typeof current === 'string'
        ? e.replace_all === true
          ? current.split(e.old_string).join(e.new_string)
          : current.replace(e.old_string, () => e.new_string)
        : e.new_string
    const text = await judge($, e.file_path, before, after)

    return text === undefined ? ran : { ...ran, context: [...(ran.context ?? []), text] }
  }).catch((_$, e, next) => next(e))
}
