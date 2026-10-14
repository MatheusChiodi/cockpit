import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const JS = /\.(?:[cm]?[jt]sx?)$/i
const CODE = /\.(?:[cm]?[jt]sx?|py|java|kt|kts|groovy|scala|cs)$/i

const MARKERS: readonly { name: string; pattern: RegExp; files: RegExp }[] = [
  { name: '".skip("', pattern: /\.skip\s*\(/g, files: JS },
  { name: '".only("', pattern: /\.only\s*\(/g, files: JS },
  { name: '"xit("', pattern: /(?<![\w.$])(?:xit|xtest|xdescribe)\s*\(/g, files: JS },
  { name: '"fit("', pattern: /(?<![\w.$])(?:fit|fdescribe)\s*\(/g, files: JS },
  { name: '"@Ignore"', pattern: /@Ignore\b/g, files: CODE },
  { name: '"@Disabled"', pattern: /@Disabled\b/g, files: CODE },
  { name: '"@pytest.mark.skip"', pattern: /@pytest\.mark\.skip\b/g, files: CODE },
]

const count = (pattern: RegExp, text: string): number => text.match(pattern)?.length ?? 0

// The first marker the edit adds: more of it in the new text than in the text it replaces.
const added = (path: string, before: string, after: string): string | undefined =>
  MARKERS.find(
    marker => marker.files.test(path) && count(marker.pattern, after) > count(marker.pattern, before),
  )?.name

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
