import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

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

const SOURCE = /\.java$/i

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

// The resource list of every try-with-resources blanked: what is declared there is already closed for you.
const withoutHeaders = (code: string): string => {
  let out = code

  for (const match of code.matchAll(/\btry\s*\(/g)) {
    const open = match.index + match[0].length - 1
    const end = closing(code, open)

    out = `${out.slice(0, open)}${' '.repeat((end === -1 ? code.length : end + 1) - open)}${out.slice((end === -1 ? code.length : end + 1))}`
  }

  return out
}

const OPEN =
  /(?<![\w.])((?:(?:private|public|protected|static)\s+)*)(?:final\s+)?[A-Z]\w*(?:\s*<[^;(){}=]*>)?(?:\[\])?\s+(\w+)\s*=\s*(?:new\s+(FileInputStream|FileOutputStream|FileReader|FileWriter|BufferedReader|BufferedWriter|InputStreamReader|OutputStreamWriter|PrintWriter|Scanner|ObjectInputStream|ObjectOutputStream|DataInputStream|DataOutputStream|BufferedInputStream|BufferedOutputStream|ZipFile|Socket|ServerSocket)\s*\(|[\w.]+\.(getConnection|prepareStatement|prepareCall|createStatement|openStream|newBufferedReader|newBufferedWriter|newInputStream|newOutputStream)\s*\()/g

const findingsIn = (_path: string, text: string): Finding[] =>
  [...withoutHeaders(blank(text, true)).matchAll(OPEN)]
    .filter(match => match[1] === '')
    .map(match => ({
      key: `open:${match[3] ?? match[4]}`,
      detail: `${match[2]} opened with ${match[3] === undefined ? `${match[4]}()` : `new ${match[3]}`} outside try-with-resources`,
    }))

const note = (found: Finding[], path: string): string =>
  `try-resources-note: ${path} now has ${[...new Set(found.map(item => item.detail))].join(', ')}. A stream, reader, connection or statement opened in a plain local leaks when anything between the open and the close throws, and on a pooled connection that exhausts the pool. Declare it in the try header: try (Connection conn = ds.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) { ... }; it is closed in reverse order, also on exceptions.`

type Finding = { key: string; detail: string }

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

// The file before and after an Edit; the edit's own strings when the file cannot be read.
const afterEdit = (current: string | undefined, old: string, next: string, all: boolean | undefined): { before: string; after: string } =>
  typeof current === 'string'
    ? { before: current, after: all === true ? current.split(old).join(next) : current.replace(old, () => next) }
    : { before: old, after: next }

// The note for the model about what the edit added; undefined when it added nothing worth a note.
const judge = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  cache.stack ??= await detect($)

  if (!cache.stack.java) {
    return undefined
  }

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

    const { before, after } = afterEdit(typeof current === 'string' ? current : undefined, e.old_string, e.new_string, e.replace_all)
    const text = await judge($, e.file_path, before, after)

    return text === undefined ? ran : { ...ran, context: [...(ran.context ?? []), text] }
  }).catch((_$, e, next) => next(e))
}
