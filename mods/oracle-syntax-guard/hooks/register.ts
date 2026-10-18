import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Key } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Stack = { java: boolean; oracle: boolean }

// Read once per module load: the stack does not change mid-session.
const cache: { stack: Stack | undefined } = { stack: undefined }

const BUILD_FILES = ['pom.xml', 'build.gradle', 'build.gradle.kts'] as const

const detect = async ($: EngineInterface): Promise<Stack> => {
  const root = await $.session.root()
  let java = false
  let oracle = false

  for (const file of BUILD_FILES) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

    if (typeof text === 'string') {
      java = true
      oracle = oracle || /\bojdbc/i.test(text)
    }
  }

  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  try {
    const parsed = JSON.parse(typeof manifest === 'string' ? manifest : '{}') as Record<string, object | undefined>
    oracle = oracle || 'oracledb' in { ...parsed.dependencies, ...parsed.devDependencies }
  } catch {
    // Invalid package.json: no Oracle driver detected there.
  }

  return { java, oracle }
}

const SOURCE = /\.(?:sql|pks|pkb|pls|ddl|java|xml)$/i

const blank = (text: string, strings: boolean): string => {
  let out = ''
  let at = 0

  while (at < text.length) {
    const char = text.charAt(at)
    const pair = text.slice(at, at + 2)

    if (text.startsWith('"""', at) || pair === '/*') {
      const close = pair === '/*' ? '*/' : '"""'
      const end = text.indexOf(close, at + close.length)
      const stop = end === -1 ? text.length : end + close.length
      const chunk = text.slice(at, stop)

      out += pair === '/*' || strings ? chunk.replace(/[^\n]/g, ' ') : chunk
      at = stop
    } else if (pair === '//') {
      const end = text.indexOf('\n', at)

      at = end === -1 ? text.length : end
    } else if (char === '"' || char === "'") {
      let stop = at + 1

      while (stop < text.length && text.charAt(stop) !== char && text.charAt(stop) !== '\n') {
        stop += text.charAt(stop) === '\\' ? 2 : 1
      }

      stop = Math.min(stop + 1, text.length)
      out += strings ? `${char}${' '.repeat(Math.max(stop - at - 2, 0))}${char}` : text.slice(at, stop)
      at = stop
    } else {
      out += char
      at += 1
    }
  }

  return out
}

// SQL string literals emptied: what is inside them is data, not syntax.
const quoted = (sql: string): string => sql.replace(/'(?:[^']|'')*'/g, "''")

const sqlOf = (path: string, text: string): string => {
  if (/\.java$/i.test(path)) {
    const code = blank(text, false)
    const joined = [...code.matchAll(/"""([\s\S]*?)"""|"((?:[^"\\\n]|\\.)*)"/g)].map(match => match[1] ?? match[2] ?? '').join('\n')

    return /\b(?:select|insert|update|delete|merge|create|alter)\b/i.test(joined) ? quoted(joined) : ''
  }

  if (/\.xml$/i.test(path)) {
    return /<(?:select|insert|update|delete|mapper|sql)\b/i.test(text) ? quoted(text.replace(/<!--[\s\S]*?-->/g, '')) : ''
  }

  return quoted(text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ''))
}

const SYNTAX: readonly { key: Key; pattern: RegExp }[] = [
  { key: 'identity', pattern: /\bgenerated\s+(?:always|by\s+default)(?:\s+on\s+null)?\s+as\s+identity\b/gi },
  { key: 'listagg', pattern: /\blistagg\s*\([^;]*?\bon\s+overflow\b/gi },
  { key: 'json', pattern: /\bjson_(?:table|value|query|object|array|arrayagg|objectagg|exists|transform|mergepatch)\s*\(|\bis\s+(?:not\s+)?json\b/gi },
]

// A BOOLEAN column of a CREATE/ALTER TABLE; PL/SQL variables and parameters may be BOOLEAN in 11g.
const BOOLEAN_COLUMN = /(?:[(,]\s*|\badd\s+(?:column\s+)?\(?\s*)"?\w+"?\s+boolean\b/gi

const findingsIn = (path: string, text: string): Finding[] => {
  const sql = sqlOf(path, text)
  const found: Finding[] = SYNTAX.flatMap(({ key, pattern }) => [...sql.matchAll(pattern)].map(match => ({ key, detail: key === 'listagg' ? 'LISTAGG ... ON OVERFLOW' : match[0].replace(/\s+/g, ' ').replace(/\($/, '').trim() })))

  for (const statement of sql.split(';')) {
    if (/^\s*(?:create\s+(?:global\s+temporary\s+)?table|alter\s+table)\b/i.test(statement)) {
      found.push(...[...statement.matchAll(BOOLEAN_COLUMN)].map(match => ({ key: 'boolean' as const, detail: match[0].replace(/^[(,\s]+|\badd\s+(?:column\s+)?\(?\s*/gi, '').trim() })))
    }
  }

  return found
}

type Finding = { key: Key; detail: string }

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

// The file before and after an Edit; the edit's own strings when the file cannot be read.
const afterEdit = (current: string | undefined, old: string, next: string, all: boolean | undefined): { before: string; after: string } =>
  typeof current === 'string'
    ? { before: current, after: all === true ? current.split(old).join(next) : current.replace(old, () => next) }
    : { before: old, after: next }

// Why the edit is refused, in the session's language; undefined when it may go ahead.
const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  if (!SOURCE.test(path)) {
    return undefined
  }

  cache.stack ??= await detect($)

  if (!cache.stack.oracle) {
    return undefined
  }

  const found = addedBy(path, before, after)

  if (found.length === 0) {
    return undefined
  }

  const s = await strings($)

  return s.blocked([...new Set(found.map(item => s.reasons[item.key](item.detail)))].join('; '))
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const current = SOURCE.test(e.file_path) ? await $.fs.read(e.file_path).catch(() => undefined) : undefined
    const deny = await verdict($, e.file_path, typeof current === 'string' ? current : '', e.content)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const current = SOURCE.test(e.file_path) ? await $.fs.read(e.file_path).catch(() => undefined) : undefined
    const { before, after } = afterEdit(typeof current === 'string' ? current : undefined, e.old_string, e.new_string, e.replace_all)
    const deny = await verdict($, e.file_path, before, after)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
