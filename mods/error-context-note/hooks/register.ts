import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SOURCE = /\.(?:[cm]?[jt]sx?|py|java)$/i

// Tests, fixtures, generated and vendored code are not where a reviewer would leave this comment.
const SKIP = /(?:^|[\\/])(?:tests?|__tests__|__mocks__|fixtures?|node_modules|vendor|dist|build|generated|\.next)[\\/]|\.(?:test|spec|stories|min|generated)\.|\.d\.ts$|_pb2\.py$/i

type Finding = { key: string; detail: string }

const THROWN: readonly RegExp[] = [
  /\bnew\s+(\w*Error)\s*\(\s*(?:(['"`])([^'"`$\n]*)\2)?\s*\)/g,
  /\braise\s+(\w*(?:Error|Exception))\s*\(\s*(['"])([^'"\n]*)\2\s*\)/g,
  /\bnew\s+(\w*Exception)\s*\(\s*(")([^"\n]*)"\s*\)/g,
]
// Messages that name no value, no operation and no cause.
const VAGUE = /^(?:error|an error occurred|an error has occurred|error occurred|something went wrong|something failed|fail|failed|failure|unexpected error|unknown error|unhandled error|internal error|server error|operation failed|request failed|invalid|invalid input|invalid argument|invalid value|invalid data|bad input|bad request|not found|exception|oops)$/

const CODE_NOISE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g
const PY_NOISE = /"""[\s\S]*?"""|'''[\s\S]*?'''|#[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g

// Comments emptied and string contents blanked (quotes kept), so patterns only see code; offsets and lines stay put.
const blank = (text: string, py = false): string =>
  text.replace(py ? PY_NOISE : CODE_NOISE, hit => {
    const hole = (part: string) => part.replace(/[^\n]/g, ' ')

    return hit.startsWith('/') || hit.startsWith('#') ? hole(hit) : hit.charAt(0) + hole(hit.slice(1, -1)) + hit.charAt(hit.length - 1)
  })

const findingsIn = (path: string, text: string): Finding[] => {
  const code = blank(text, /\.py$/i.test(path))
  const found: Finding[] = []

  for (const pattern of THROWN) {
    for (const match of text.matchAll(pattern)) {
      // A throw inside a comment or a string is blanked in the code view.
      if (code.charAt(match.index ?? 0) === ' ') {
        continue
      }

      const kind = match[1] ?? 'Error'
      const message = match[3]

      // Only Error itself is flagged when empty: a custom class may build its own message.
      if (message === undefined ? kind === 'Error' : VAGUE.test(message.trim().toLowerCase().replace(/[.!\s]+$/, ''))) {
        found.push({ key: match[0], detail: message === undefined ? `${kind}()` : `${kind}("${message}")` })
      }
    }
  }

  return found
}

const note = (found: Finding[], path: string): string =>
  `error-context-note: ${path} now throws an error that says nothing: ${listOf(found)}. Whoever reads the log or the stack sees the message and nothing else, so it has to name the operation, the value and the reason. Say what was being done and with what, e.g. Failed to read config at ${'$'}{path}: ${'$'}{reason}.`

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
