import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SOURCE = /\.(?:[cm]?[jt]sx?|py|java|kt|cs|go|rs)$/i

// Tests, fixtures, generated and vendored code are not where a reviewer would leave this comment.
const SKIP = /(?:^|[\\/])(?:tests?|__tests__|__mocks__|fixtures?|node_modules|vendor|dist|build|generated|\.next)[\\/]|\.(?:test|spec|stories|min|generated)\.|\.d\.ts$|_pb2\.py$/i

type Finding = { key: string; detail: string }

const CODE_NOISE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g
const PY_NOISE = /"""[\s\S]*?"""|'''[\s\S]*?'''|#[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g

// Comments emptied and string contents blanked (quotes kept), so patterns only see code; offsets and lines stay put.
const blank = (text: string, py = false): string =>
  text.replace(py ? PY_NOISE : CODE_NOISE, hit => {
    const hole = (part: string) => part.replace(/[^\n]/g, ' ')

    return hit.startsWith('/') || hit.startsWith('#') ? hole(hit) : hit.charAt(0) + hole(hit.slice(1, -1)) + hit.charAt(hit.length - 1)
  })

// Three digits or more, or a decimal with two places: a number a reader cannot name.
const NUMBER = /(?<![\w.$])(\d{3,}|\d+\.\d{2,})(?![\w.])/g
// Round sizes and HTTP statuses everyone reads at a glance.
const KNOWN = new Set(['100', '128', '200', '201', '204', '255', '256', '400', '401', '403', '404', '500', '512', '1000', '1024'])
// A line that names its number (MAX_RETRIES = 500) or lists many of them (a table) is not a use.
const NAMED = /^\s*(?:(?:export|const|let|var|final|static|private|public|readonly|val)\s+)*[A-Z][A-Z0-9_]*\s*(?::[^=]+)?=/
const REPEATS = 3

const findingsIn = (path: string, text: string): Finding[] => {
  const seen = new Map<string, number>()

  for (const line of blank(text, /\.py$/i.test(path)).split('\n')) {
    const numbers = line.match(NUMBER) ?? []

    if (NAMED.test(line) || numbers.length > 3) {
      continue
    }

    for (const number of numbers) {
      if (!KNOWN.has(number)) {
        seen.set(number, (seen.get(number) ?? 0) + 1)
      }
    }
  }

  return [...seen].filter(([, count]) => count >= REPEATS).map(([number, count]) => ({ key: number, detail: `${number} (${count}x)` }))
}

const note = (found: Finding[], path: string): string =>
  `magic-number-note: ${path} now repeats a bare number: ${listOf(found)}. A literal says nothing about what it means, and changing it later means finding every copy. Name it once (const TIMEOUT_MS = 3000) and use the name.`

const listOf = (found: Finding[]): string => [...new Set(found.map(item => item.detail))].join(', ')

// What the edit adds: findings the file did not already have, matched by count.
const addedBy = (path: string, before: string, after: string): Finding[] => {
  const had = new Map<string, number>()

  for (const found of findingsIn(path, before)) {
    had.set(found.key, (had.get(found.key) ?? 0) + 1)
  }

  return findingsIn(path, after).filter(found => {
    const left = had.get(found.key) ?? 0

    if (left > 0) {
      had.set(found.key, left - 1)

      return false
    }

    return true
  })
}

const relative = async ($: EngineInterface, path: string): Promise<string> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? slashed.slice(root.length + 1) : slashed
}

// The note for the model about what the edit added; undefined when it added nothing worth a note.
const judge = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  const found = addedBy(path, before, after)
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
    if (SKIP.test(e.file_path) || !SOURCE.test(e.file_path)) {
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
    if (SKIP.test(e.file_path) || !SOURCE.test(e.file_path)) {
      return next(e)
    }

    const current = await $.fs.read(e.file_path).catch(() => undefined)

    // Without the file there is no telling what the edit adds to it.
    if (typeof current !== 'string') {
      return next(e)
    }

    const ran = await next(e)

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const after = e.replace_all === true ? current.split(e.old_string).join(e.new_string) : current.replace(e.old_string, () => e.new_string)
    const text = await judge($, e.file_path, current, after)

    return text === undefined ? ran : { ...ran, context: [...(ran.context ?? []), text] }
  }).catch((_$, e, next) => next(e))
}
