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

const stackOf = (deps: Set<string>): Stack => deps.has('tailwindcss') || deps.has('nativewind') || deps.has('@tailwindcss/vite')

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

const COLOR =
  '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}|white|black|transparent|current|inherit'

// Utilities that set the same property: two of them with the same variants on one element conflict.
const GROUPS: readonly (readonly [string, RegExp])[] = [
  ['display', /^(?:block|inline|inline-block|flex|inline-flex|grid|inline-grid|hidden|table|contents|flow-root)$/],
  ['position', /^(?:static|fixed|absolute|relative|sticky)$/],
  ['text size', /^text-(?:xs|sm|base|lg|xl|[2-9]xl)$/],
  ['text align', /^text-(?:left|center|right|justify|start|end)$/],
  ['text color', new RegExp(`^text-(?:${COLOR})(?:/\\d+)?$`)],
  ['background color', new RegExp(`^bg-(?:${COLOR})(?:/\\d+)?$`)],
  ['font weight', /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/],
  ['flex direction', /^flex-(?:row|col)(?:-reverse)?$/],
  ['justify', /^justify-(?:start|end|center|between|around|evenly|normal|stretch)$/],
  ['items', /^items-(?:start|end|center|baseline|stretch)$/],
  ['overflow', /^overflow-(?:auto|hidden|visible|scroll|clip)$/],
  ['rounded', /^rounded(?:-(?:none|sm|md|lg|xl|[23]xl|full))?$/],
  ['shadow', /^shadow(?:-(?:sm|md|lg|xl|2xl|inner|none))?$/],
]

const SCALED = /^-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|gap|gap-x|gap-y|size|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|z|leading|tracking|opacity)-.+$/

const groupOf = (utility: string): string | undefined =>
  GROUPS.find(([, pattern]) => pattern.test(utility))?.[0] ?? SCALED.exec(utility)?.[1]

// The text of every className attribute: its string literals, one entry each.
const literalsOf = (text: string): string[] => {
  const literals: string[] = []

  for (const match of text.matchAll(/\b(?:className|class)\s*=\s*/g)) {
    const at = match.index + match[0].length
    const first = text.charAt(at)

    if (first === '"' || first === "'") {
      const end = text.indexOf(first, at + 1)

      if (end !== -1) {
        literals.push(text.slice(at + 1, end))
      }
    } else if (first === '{') {
      const end = closing(text, at)

      for (const literal of (end === -1 ? '' : text.slice(at + 1, end)).matchAll(/(["'`])((?:(?!\1)[^\\$]|\\.)*)\1/g)) {
        literals.push(literal[2] ?? '')
      }
    }
  }

  return literals
}

const findingsIn = (_stack: Stack, text: string): Finding[] => {
  const found: Finding[] = []

  for (const literal of literalsOf(text)) {
    const seen = new Map<string, string>()

    for (const token of literal.trim().split(/\s+/)) {
      const parts = token.split(/:(?![^[]*\])/)
      const utility = (parts.pop() ?? '').replace(/^!/, '')
      const group = groupOf(utility)

      if (group === undefined) {
        continue
      }

      const id = `${parts.join(':')}|${group}`
      const first = seen.get(id)

      if (first === undefined) {
        seen.set(id, token)
      } else {
        found.push({ key: `${group}:${[first, token].sort().join('|')}`, detail: `${first} and ${token}` })
      }
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
  `tw-conflict-note: ${path} now has conflicting Tailwind classes on one element: ${[...new Set(found.map(item => item.detail))].join('; ')}. Both set the same CSS property, and the winner is decided by the order in the generated stylesheet, not by the order in className, so the result is unpredictable. Keep one of each pair, or move the other behind a variant (md:, hover:, dark:) or a condition.`

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
