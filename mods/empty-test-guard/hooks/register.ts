import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TEST_FILE = /[.\-_](?:test|spec)\.[a-z]+$|(?:^|[\\/])test_[^\\/]*\.py$|Tests?\.(?:java|kt|cs)$/i

const CASE = /(?<![\w.$])(?:it|test)\s*\(|\bdef\s+test_\w+|@Test\b|\bfunc\s+Test\w+\s*\(/g
const ASSERTION =
  /\b(?:expect|assert\w*|verify|fail|should|toBe\w*|toEqual|toThrow\w*|toHaveBeen\w*|toMatch\w*|toContain|toStrictEqual|t\.(?:Error|Errorf|Fatal|Fatalf))\b/

const count = (pattern: RegExp, text: string): number => text.match(pattern)?.length ?? 0

// New test cases and not a single assertion anywhere in the new text.
const isEmpty = (path: string, before: string, after: string): boolean =>
  TEST_FILE.test(path) && count(CASE, after) > count(CASE, before) && !ASSERTION.test(after)

const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> =>
  isEmpty(path, before, after) ? (await strings($)).blocked : undefined

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
