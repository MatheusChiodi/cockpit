import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SOURCE = /\.(?:[cm]?[jt]sx?|py|java|kt|cs|go|rs)$/i

// Tests, fixtures, generated and vendored code are not where a reviewer would leave this comment.
const SKIP = /(?:^|[\\/])(?:tests?|__tests__|__mocks__|fixtures?|node_modules|vendor|dist|build|generated|\.next)[\\/]|\.(?:test|spec|stories|min|generated)\.|\.d\.ts$|_pb2\.py$/i

type Finding = { key: string; detail: string }

const RUN = 3
const SLASHES = /^\s*\/\/(?![/!])\s?(.*)$/
const HASH = /^\s*#(?!!)\s?(.*)$/

// Shapes of code that prose does not take: a statement ending, a call, an assignment, an import.
const CODEISH: readonly RegExp[] = [
  /[;{}]$/,
  /^[\w$]+(?:\.[\w$]+)*\([^)]*\)[;,]?$/,
  /^(?:const|let|var)\s+[\w$]+\s*(?::[^=]+)?=\s*\S/,
  /^[\w$.[\]]+\s*[-+*/]?=\s*[^=\s]/,
  /^import\s.+\sfrom\s|^from\s+[\w.]+\s+import\s/,
  /^(?:def|class)\s+\w+.*:$/,
]

const findingsIn = (path: string, text: string): Finding[] => {
  const comment = /\.py$/i.test(path) ? HASH : SLASHES
  const found: Finding[] = []
  let run = 0
  let first = ''

  for (const line of text.split('\n')) {
    const body = comment.exec(line)?.[1]?.trim() ?? ''

    if (body !== '' && CODEISH.some(shape => shape.test(body))) {
      run += 1
      first = run === 1 ? body : first

      if (run === RUN) {
        found.push({ key: first, detail: `${RUN}+ commented-out lines at "${first.slice(0, 40)}"` })
      }
    } else {
      run = 0
    }
  }

  return found
}

const note = (found: Finding[], path: string): string =>
  `commented-code-note: ${path} now holds commented-out code: ${listOf(found)}. Dead code left in a comment goes stale and nobody dares delete it; version control already keeps the old version. Delete it, or turn the comment into a sentence that says why.`

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
