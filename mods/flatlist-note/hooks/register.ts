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

const stackOf = (deps: Set<string>): Stack => deps.has('react-native')

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

// Index of the `>` that ends the opening tag starting at `from`; braces inside attributes are skipped.
const tagEnd = (text: string, from: number): number => {
  let depth = 0

  for (let at = from; at < text.length; at += 1) {
    const char = text.charAt(at)

    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
    } else if (char === '>' && depth === 0) {
      return at
    }
  }

  return -1
}

const JSX_RETURNED = /(?:=>|\breturn\b|\(|\?|:|&&)\s*<(?:[A-Za-z]|>)/

const findingsIn = (_stack: Stack, text: string): Finding[] => {
  const found: Finding[] = []

  for (const scroll of text.matchAll(/<ScrollView\b/g)) {
    const start = scroll.index + scroll[0].length
    const end = tagEnd(text, start)
    const close = end === -1 || text.charAt(end - 1) === '/' ? -1 : text.indexOf('</ScrollView>', end)

    // A horizontal ScrollView holds chips and tabs: a handful of items, no virtualization needed.
    if (close === -1 || /\bhorizontal\b/.test(text.slice(start, end))) {
      continue
    }

    const inner = text.slice(end + 1, close)

    for (const map of inner.matchAll(/\.map\s*\(/g)) {
      const open = map.index + map[0].length - 1
      const stop = closing(inner, open)

      if (stop !== -1 && JSX_RETURNED.test(inner.slice(open + 1, stop))) {
        found.push({ key: 'map', detail: 'a mapped list inside a ScrollView' })
      }
    }

    for (const list of inner.matchAll(/<FlatList\b/g)) {
      const listEnd = tagEnd(inner, list.index + list[0].length)

      if (!/\bhorizontal\b/.test(inner.slice(list.index, listEnd === -1 ? undefined : listEnd))) {
        found.push({ key: 'nested', detail: 'a vertical FlatList nested in a ScrollView' })
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
  `flatlist-note: ${path} now has ${[...new Set(found.map(item => item.detail))].join(' and ')}. ScrollView mounts every child at once, so a long list costs memory and a slow first render; a vertical FlatList inside a vertical ScrollView loses its virtualization and logs a "VirtualizedLists should never be nested" warning. Render the list with <FlatList data renderItem keyExtractor> (or FlashList) and put the rest of the screen in ListHeaderComponent / ListFooterComponent. A ScrollView is fine for a handful of fixed items.`

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
