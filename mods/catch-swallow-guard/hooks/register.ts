import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const BRACES = /\.(?:[cm]?[jt]sx?|java|kt|kts|cs|scala|vue|svelte|php)$/i
const PY = /\.pyi?$/i

// A block with nothing in it: a comment inside is a deliberate choice and is let through.
const MARKERS: readonly { what: 'empty' | 'pass'; pattern: RegExp; files: RegExp }[] = [
  { what: 'empty', pattern: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/g, files: BRACES },
  { what: 'empty', pattern: /\.catch\(\s*(?:\([^)]*\)|\w+)?\s*=>\s*\{\s*\}\s*\)/g, files: BRACES },
  { what: 'pass', pattern: /\bexcept\b[^:\n]*:[ \t]*(?:\r?\n[ \t]*)?(?:pass|\.\.\.)[ \t]*$/gm, files: PY },
]

const count = (pattern: RegExp, text: string): number => text.match(pattern)?.length ?? 0

// The first marker the edit adds: more of it in the new text than in the text it replaces.
const added = (path: string, before: string, after: string): 'empty' | 'pass' | undefined =>
  MARKERS.find(marker => marker.files.test(path) && count(marker.pattern, after) > count(marker.pattern, before))?.what

const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  const what = added(path, before, after)

  if (what === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.blocked(s[what])
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
