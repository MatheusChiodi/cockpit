import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const CODE = /\.(?:[cm]?[jt]sx?|py|go|java|kt|kts|scala|cs|vue|svelte)$/i

// Blanket only: a named rule or error code (`# noqa: E501`, `//nolint:errcheck`) is a deliberate exception.
const MARKERS: readonly { name: string; pattern: RegExp }[] = [
  { name: '"eslint-disable"', pattern: /eslint-disable(?:-next-line|-line)?\b/g },
  { name: '"@ts-ignore"', pattern: /@ts-ignore\b/g },
  { name: '"@ts-nocheck"', pattern: /@ts-nocheck\b/g },
  { name: '"# type: ignore"', pattern: /#\s*type:\s*ignore(?!\[)/g },
  { name: '"# noqa"', pattern: /#\s*noqa\b(?!\s*:\s*[A-Za-z]+\d)/gi },
  { name: '"//nolint"', pattern: /\/\/\s*nolint\b(?!\s*:\s*\w)/g },
  { name: '@SuppressWarnings("all")', pattern: /@SuppressWarnings\(\s*(?:value\s*=\s*)?\{?\s*["']all["']\s*\}?\s*\)/g },
]

const count = (pattern: RegExp, text: string): number => text.match(pattern)?.length ?? 0

// The first marker the edit adds: more of it in the new text than in the text it replaces.
const added = (path: string, before: string, after: string): string | undefined =>
  CODE.test(path) ? MARKERS.find(marker => count(marker.pattern, after) > count(marker.pattern, before))?.name : undefined

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
