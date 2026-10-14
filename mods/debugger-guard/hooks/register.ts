import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const JS = /\.(?:[cm]?[jt]sx?|vue|svelte)$/i
const PY = /\.pyi?$/i
const RB = /\.rb$/i

const MARKERS: readonly { name: string; pattern: RegExp; files: RegExp }[] = [
  { name: 'a "debugger" statement', pattern: /^[ \t]*debugger[ \t]*;?[ \t]*$/gm, files: JS },
  { name: '"breakpoint()"', pattern: /(?<![\w.])breakpoint\s*\(\s*\)/g, files: PY },
  { name: '"pdb.set_trace()"', pattern: /\bi?pdb\.set_trace\s*\(/g, files: PY },
  { name: '"import pdb"', pattern: /^[ \t]*import\s+i?pdb\b/gm, files: PY },
  { name: '"binding.pry"', pattern: /\bbinding\.(?:pry|irb)\b/g, files: RB },
  { name: '"byebug"', pattern: /^[ \t]*byebug\b/gm, files: RB },
]

const count = (pattern: RegExp, text: string): number => text.match(pattern)?.length ?? 0

// The first marker the edit adds: more of it in the new text than in the text it replaces.
const added = (path: string, before: string, after: string): string | undefined =>
  MARKERS.find(marker => marker.files.test(path) && count(marker.pattern, after) > count(marker.pattern, before))?.name

const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  const marker = added(path, before, after)

  return marker === undefined ? undefined : (await strings($)).blocked(marker)
}

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path, e.old_string, e.new_string)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path, '', e.content)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
