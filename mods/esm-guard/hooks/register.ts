import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Read once per module load: whether package.json declares "type": "module".
const cache: { isModule: boolean | undefined } = { isModule: undefined }

const detect = async ($: EngineInterface): Promise<boolean> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  try {
    return (JSON.parse(typeof manifest === 'string' ? manifest : '{}') as { type?: unknown }).type === 'module'
  } catch {
    return false
  }
}

// .cjs files and TypeScript (compiled by a tool that decides the format) are not judged.
const JS_FILE = /\.(?:js|jsx|mjs)$/i

const COMMENTS = /\/\*[\s\S]*?\*\/|(^|[^:])\/\/[^\n]*/g

type Problem = 'require' | 'exports' | '__dirname' | '__filename'

const problemsIn = (text: string): Problem[] => {
  const code = text.replace(COMMENTS, '$1')
  const found: Problem[] = []

  if (/(?<![\w.$])require\s*\(/.test(code) && !code.includes('createRequire')) {
    found.push('require')
  }

  if (/\bmodule\.exports\b|(?<![\w.$])exports\.\w+\s*=/.test(code)) {
    found.push('exports')
  }

  for (const name of ['__dirname', '__filename'] as const) {
    if (new RegExp(`(?<![\\w$.])${name}\\b`).test(code)) {
      found.push(name)
    }
  }

  return found
}

const relative = async ($: EngineInterface, path: string): Promise<string | undefined> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) && !slashed.includes('/node_modules/')
    ? slashed.slice(root.length + 1)
    : undefined
}

// Why the edit is refused; undefined when it adds no CommonJS to an ES module package.
const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  cache.isModule ??= await detect($)
  const rel = await relative($, path)

  if (!cache.isModule || rel === undefined || !JS_FILE.test(rel)) {
    return undefined
  }

  const had = problemsIn(before)
  const added = problemsIn(after).find(problem => !had.includes(problem))

  if (added === undefined) {
    return undefined
  }

  const s = await strings($)

  return added === 'require' ? s.require(rel) : added === 'exports' ? s.exports(rel) : s.dirname(added, rel)
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const before = await $.fs.read(e.file_path).catch(() => undefined)
    const deny = await verdict($, e.file_path, typeof before === 'string' ? before : '', e.content)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path, e.old_string, e.new_string)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
