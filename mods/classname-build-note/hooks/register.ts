import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Stack = { tailwind: boolean; helper: string | undefined }

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

const stackOf = (deps: Set<string>): Stack => ({
  tailwind: deps.has('tailwindcss') || deps.has('nativewind') || deps.has('@tailwindcss/vite'),
  helper: deps.has('tailwind-merge')
    ? 'twMerge (usually behind a cn helper)'
    : deps.has('clsx')
      ? 'clsx'
      : deps.has('classnames')
        ? 'classnames'
        : deps.has('class-variance-authority')
          ? 'cva'
          : undefined,
})

const active = (stack: Stack): boolean => stack.tailwind

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

const WRAPPED = /^\s*(?:cn|clsx|cx|classnames|classNames|twMerge|cva)\s*\(/

const findingsIn = (_stack: Stack, text: string): Finding[] => {
  const found: Finding[] = []

  for (const match of text.matchAll(/\bclassName\s*=\s*\{/g)) {
    const open = match.index + match[0].length - 1
    const end = closing(text, open)
    const expr = end === -1 ? '' : text.slice(open + 1, end)
    const fragment = /[\w:-]*-\$\{[^}]*\}[\w-]*/.exec(expr)?.[0] ?? /['"`][\w:-]*-['"`]\s*\+\s*[\w.]*/.exec(expr)?.[0]

    if (fragment !== undefined) {
      found.push({ key: `dynamic:${fragment}`, detail: `a class assembled from a fragment (${fragment})` })
    } else if (!WRAPPED.test(expr) && (/`[^`]*\$\{[^}]*(?:\?|&&|\|\|)[^}]*\}/.test(expr) || /['"]\s*\+\s*[\w(]/.test(expr))) {
      found.push({ key: `build:${expr.replace(/\s+/g, ' ').slice(0, 60)}`, detail: 'a className built by concatenation' })
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

const note = (found: Finding[], path: string): string => {
  const dynamic = found.some(item => item.key.startsWith('dynamic:'))
  const helper = cache.stack?.helper

  return `classname-build-note: ${path} now has ${[...new Set(found.map(item => item.detail))].join(', ')}. ${
    dynamic
      ? 'Tailwind finds classes by scanning the source for complete names, so bg-${color}-500 is never generated and the style silently does not apply. Write the full class names and pick between them: const COLORS = { red: "bg-red-500", blue: "bg-blue-500" } and COLORS[color].'
      : `Conditional pieces glued into one string leave stray spaces and are hard to read, and later classes do not override earlier ones reliably. Use ${helper === undefined ? 'a small helper that joins the truthy parts (clsx, or an array filtered and joined)' : `the project's ${helper}`}: className={cn('base', active && 'bg-blue-500')}.`
  }`
}

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
