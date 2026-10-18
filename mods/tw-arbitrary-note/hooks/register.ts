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

const SPACING = 'p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|size|gap|gap-x|gap-y|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|inset-x|inset-y|space-x|space-y'
const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96]
const TEXT: Record<string, string> = {
  '12': 'xs',
  '14': 'sm',
  '16': 'base',
  '18': 'lg',
  '20': 'xl',
  '24': '2xl',
  '30': '3xl',
  '36': '4xl',
  '48': '5xl',
  '60': '6xl',
  '72': '7xl',
  '96': '8xl',
  '128': '9xl',
}

const ARBITRARY = new RegExp(`(?<![\\w:-])((?:[\\w-]+:)*)(-?)(${SPACING}|text|z)-\\[(\\d+(?:\\.\\d+)?)(px|rem)?\\]`, 'g')

// The class the scale has for this value; undefined when the scale has no such step.
const stepFor = (prefix: string, value: number, unit: string | undefined): string | undefined => {
  if (prefix === 'z') {
    return unit === undefined && [0, 10, 20, 30, 40, 50].includes(value) ? String(value) : undefined
  }

  if (prefix === 'text') {
    return TEXT[String(unit === 'rem' ? value * 16 : value)]
  }

  if (unit === 'px' && value === 1) {
    return 'px'
  }

  const step = unit === 'rem' ? value * 4 : unit === 'px' ? value / 4 : undefined

  return step !== undefined && (step === 0 || STEPS.includes(step)) ? String(step) : undefined
}

const findingsIn = (_stack: Stack, text: string): Finding[] => {
  const found: Finding[] = []

  for (const match of text.matchAll(ARBITRARY)) {
    const [token, variants = '', negative = '', prefix = '', amount = '0', unit] = match
    const step = stepFor(prefix, Number(amount), unit)

    if (step !== undefined) {
      found.push({ key: token, detail: `${token} (use ${variants}${negative}${prefix}-${step})` })
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
  `tw-arbitrary-note: ${path} now uses an arbitrary value where the Tailwind scale has the step: ${[...new Set(found.map(item => item.detail))].join(', ')}. Scale classes keep spacing and type consistent and can be changed in one place in the theme; keep brackets for values that really are off the scale.`

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
