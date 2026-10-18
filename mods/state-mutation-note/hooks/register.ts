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

const MUTATORS = 'push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin'

const findingsIn = (_stack: Stack, text: string): Finding[] => {
  const found: Finding[] = []
  const names = [...text.matchAll(/\bconst\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*[A-Za-z_$][\w$]*\s*\]\s*=\s*(?:React\.)?useState\b/g)].map(match => match[1] ?? '')

  for (const name of new Set(names)) {
    const escaped = name.replaceAll('$', '\\$')

    // A local variable of the same name elsewhere in the file: it may be the one being changed.
    if (new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\b`).test(text)) {
      continue
    }

    const call = new RegExp(`(?<![.\\w$])${escaped}\\.(?:${MUTATORS})\\s*\\(`, 'g')
    const assign = new RegExp(`(?<![.\\w$])${escaped}(?:\\.[\\w$]+|\\[[^\\]\\n]+\\])+\\s*(?:=(?![=>])|\\+=|-=|\\*=|\\+\\+|--)`, 'g')

    for (const match of text.matchAll(call)) {
      found.push({ key: `${name}:${match[0]}`, detail: `${match[0].replace(/\s+/g, '')}…)` })
    }

    for (const match of text.matchAll(assign)) {
      found.push({ key: `${name}:${match[0]}`, detail: `${match[0].trim()} …` })
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
  `state-mutation-note: ${path} now changes state in place: ${[...new Set(found.map(item => item.detail))].join(', ')}. React compares state by reference, so a mutated array or object passed back to the setter looks unchanged: nothing re-renders, and memoized children and effect dependencies miss the change. Build a new value instead: setItems([...items, x]), items.filter(...), items.map(...), toSorted(), { ...user, name }.`

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
