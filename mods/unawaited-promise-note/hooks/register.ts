import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SOURCE = /\.(?:[cm]?[jt]sx?)$/i

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

// Index of the parenthesis that closes the one opened at `open`; -1 when it never closes.
const closing = (text: string, open: number): number => {
  let depth = 0

  for (let at = open; at < text.length; at += 1) {
    const char = text.charAt(at)

    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth -= 1

      if (depth === 0) {
        return at
      }
    }
  }

  return -1
}

// What continues an expression on the next line: the call is not a statement of its own then.
const CONTINUES = '.?([+*/,&|=<>:'

// Functions the file declares async, plus fetch.
const asyncNames = (code: string): Set<string> => {
  const names = new Set(['fetch'])
  const declarations = [
    /\basync\s+function\s*\*?\s*([A-Za-z_$][\w$]*)/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*async\b/g,
    /\basync\s+([A-Za-z_$][\w$]*)\s*\(/g,
  ]

  for (const pattern of declarations) {
    for (const match of code.matchAll(pattern)) {
      const name = match[1]

      if (name !== undefined && name !== 'function') {
        names.add(name)
      }
    }
  }

  return names
}

const findingsIn = (_path: string, text: string): Finding[] => {
  const code = blank(text)
  const names = asyncNames(code)
  const found: Finding[] = []

  for (const match of code.matchAll(/^[ \t]*(?:this\.)?([A-Za-z_$][\w$]*)\s*\(/gm)) {
    const name = match[1] ?? ''
    const at = match.index ?? 0
    const close = closing(code, at + match[0].length - 1)

    if (!names.has(name) || close === -1) {
      continue
    }

    const tail = code.slice(close + 1)
    const nextChar = tail.trimStart().charAt(0)
    const statement = /^[ \t]*;/.test(tail) || (/^[ \t]*(?:\r?\n|$)/.test(tail) && (nextChar === '' || !CONTINUES.includes(nextChar)))

    // The call starts a statement: after a semicolon, a brace or a parenthesis, not inside an expression.
    if (statement && ';{})'.includes(code.slice(0, at).trimEnd().slice(-1))) {
      const call = text.slice(at, close + 1).replace(/\s+/g, ' ').trim()

      found.push({ key: call, detail: call.length > 50 ? `${name}(…)` : call })
    }
  }

  return found
}

const note = (found: Finding[], path: string): string =>
  `unawaited-promise-note: ${path} now calls an async function and drops its promise: ${listOf(found)}. The next line runs before it finishes, and if it fails nothing catches the error. Add await, return it, or mark it deliberate with void and a .catch.`

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
