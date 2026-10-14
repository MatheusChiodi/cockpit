import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Always generated or third-party.
const ALWAYS = /(^|[\\/])(node_modules|\.next|\.nuxt|\.expo|\.turbo|coverage|__pycache__|\.venv|\.git)[\\/]/i

// Names that are also code folders (src/build, app/out): they only count outside a source folder.
const AMBIGUOUS = /(^|[\\/])(dist|build|out|target|vendor)[\\/]/i
const SOURCE = /(^|[\\/])(src|app|lib|scripts|packages|tests?)[\\/]/i

const isGenerated = (path: string): boolean => {
  if (ALWAYS.test(path)) {
    return true
  }

  const at = path.search(AMBIGUOUS)

  return at >= 0 && !SOURCE.test(path.slice(0, at + 1))
}

// The refusal for a path, in the session's language; undefined when the path may be edited.
const verdict = async ($: EngineInterface, path: string): Promise<string | undefined> =>
  isGenerated(path) ? (await strings($)).denied(path) : undefined

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
