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

// The imported local names of every import statement, with the line they sit on.
const IMPORT = /^[ \t]*import\s+(?:type\s+)?([^'";]+?)\s+from\s*['"][^'"\n]+['"]/gm

const localNames = (clause: string): string[] => {
  const names: string[] = []
  const braces = /\{([^}]*)\}/.exec(clause)

  for (const part of braces?.[1]?.split(',') ?? []) {
    const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim() ?? ''

    if (/^[A-Za-z_$][\w$]*$/.test(name)) {
      names.push(name)
    }
  }

  for (const part of clause.replace(/\{[^}]*\}/, '').split(',')) {
    const name = part.trim().replace(/^\*\s*as\s+/, '')

    if (/^[A-Za-z_$][\w$]*$/.test(name)) {
      names.push(name)
    }
  }

  return names
}

const importedIn = (code: string): string[] => [...code.matchAll(IMPORT)].flatMap(match => localNames(match[1] ?? ''))

const findingsIn = (_path: string, text: string): Finding[] => {
  const code = blank(text)
  const found: Finding[] = []

  for (const name of new Set(importedIn(code))) {
    const declared = new RegExp(`\\b(?:const|let|var|function|class)\\s+\\*?\\s*${name.replaceAll('$', '\\$')}(?![\\w$])`, 'g')

    for (const _hit of code.matchAll(declared)) {
      found.push({ key: name, detail: name })
    }
  }

  return found
}

const note = (found: Finding[], path: string): string =>
  `import-shadow-note: ${path} now declares a name that is also imported: ${listOf(found)}. Inside that scope the import is unreachable, and a later edit that expects the library gets the local one. Rename the local, or alias the import (import { x as libX }).`

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
