import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Read once per module load: whether the project is a Next.js one.
const cache: { next: boolean | undefined } = { next: undefined }

const detect = async ($: EngineInterface): Promise<boolean> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  try {
    const parsed = JSON.parse(typeof manifest === 'string' ? manifest : '{}') as Record<string, object | undefined>

    return 'next' in (parsed.dependencies ?? {}) || 'next' in (parsed.devDependencies ?? {})
  } catch {
    return false
  }
}

const APP_FILE = /^(?:src\/)?app\/.*\.(?:tsx|jsx)$/
const SPECIAL = /(?:^|\/)(?:page|layout|template|default|not-found|loading|error|global-error)\.(?:tsx|jsx)$/
const CLIENT_DIRECTIVE = /^\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)*['"]use client['"]/
const CLIENT_ONLY =
  /\b(use(?:State|Effect|LayoutEffect|Reducer|Ref|Context|Callback|Memo|Transition|DeferredValue|ImperativeHandle|SyncExternalStore|Router|Pathname|SearchParams|Params))\s*\(|\b(on[A-Z]\w+)=\{/
const SERVER_ONLY = /\b(?:from|import)\s*['"](server-only|next\/headers|(?:node:)?fs(?:\/promises)?|(?:node:)?child_process)['"]/
const ASYNC_DEFAULT = /\bexport\s+default\s+async\b/

type Problem = { kind: 'needsClient' | 'errorClient' | 'asyncClient' | 'serverOnly'; detail: string }

// What is wrong with a file of the app router, given its project-relative path and full text.
const problemsIn = (path: string, text: string): Problem[] => {
  if (!APP_FILE.test(path)) {
    return []
  }

  const isClient = CLIENT_DIRECTIVE.test(text)

  if (!isClient) {
    if (/(?:^|\/)(?:error|global-error)\.(?:tsx|jsx)$/.test(path)) {
      return [{ kind: 'errorClient', detail: '' }]
    }

    const only = CLIENT_ONLY.exec(text)
    const isComponent = SPECIAL.test(path) || /\bexport\s+default\b/.test(text)

    return only !== null && isComponent ? [{ kind: 'needsClient', detail: only[1] ?? only[2] ?? '' }] : []
  }

  const found: Problem[] = []

  if (ASYNC_DEFAULT.test(text)) {
    found.push({ kind: 'asyncClient', detail: '' })
  }

  const server = SERVER_ONLY.exec(text)

  if (server !== null) {
    found.push({ kind: 'serverOnly', detail: server[1] ?? '' })
  }

  return found
}

const relative = async ($: EngineInterface, path: string): Promise<string | undefined> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? slashed.slice(root.length + 1) : undefined
}

// Why the edit is refused; undefined when the file it produces keeps the boundary or already broke it.
const verdict = async ($: EngineInterface, path: string, before: string | undefined, after: string): Promise<string | undefined> => {
  cache.next ??= await detect($)
  const rel = await relative($, path)

  if (!cache.next || rel === undefined) {
    return undefined
  }

  const had = new Set((before === undefined ? [] : problemsIn(rel, before)).map(problem => `${problem.kind}:${problem.detail}`))
  const added = problemsIn(rel, after).find(problem => !had.has(`${problem.kind}:${problem.detail}`))

  if (added === undefined) {
    return undefined
  }

  const s = await strings($)

  switch (added.kind) {
    case 'needsClient':
      return s.needsClient(added.detail, rel)
    case 'errorClient':
      return s.errorClient(rel)
    case 'asyncClient':
      return s.asyncClient(rel)
    default:
      return s.serverOnly(added.detail, rel)
  }
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const before = await $.fs.read(e.file_path).catch(() => undefined)
    const deny = await verdict($, e.file_path, typeof before === 'string' ? before : undefined, e.content)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const current = await $.fs.read(e.file_path).catch(() => undefined)

    if (typeof current !== 'string') {
      return next(e)
    }

    const after = e.replace_all === true ? current.split(e.old_string).join(e.new_string) : current.replace(e.old_string, () => e.new_string)
    const deny = await verdict($, e.file_path, current, after)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
