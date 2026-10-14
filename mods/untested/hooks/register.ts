import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const CODE = /\.(?:[cm]?[jt]sx?|py|java|kt|kts|go|rs|cs|scala|vue|svelte|php|rb)$/i
const TEST_FILE = /[.\-_](?:test|spec)\.|(?:^|[\\/])(?:tests?|__tests__)[\\/]|(?:^|[\\/])test_[^\\/]*$|Tests?\.(?:java|kt|cs)$/i
const GENERATED = /(?:^|\/)(?:node_modules|dist|build|coverage|\.next|vendor)\/|\.d\.ts$|\.config\.[cm]?[jt]s$/

const MAX_LISTED = 40

const normal = (path: string): string => path.replaceAll('\\', '/')

// What a file is called for matching: `cart.test.ts`, `test_cart.py` and `CartTest.java` all say "cart".
// An index file takes the name of its folder.
const stemOf = (path: string): string => {
  const parts = normal(path).split('/')
  const base = (parts.pop() ?? '').replace(/\.[^.]+$/, '')
  const name = base === 'index' || base === 'mod' ? (parts.pop() ?? base) : base

  return name
    .replace(/[.\-_](?:test|spec)$/i, '')
    .replace(/^test_/i, '')
    .replace(/Tests?$/, '')
    .toLowerCase()
}

const git = async ($: EngineInterface, args: readonly string[]): Promise<string | undefined> => {
  const ran = await $.process.run(['git', '--no-pager', ...args], { timeoutMs: 10000 }).catch(() => undefined)

  return ran === undefined || ran.exitCode !== 0 ? undefined : ran.stdout
}

// Paths from `git status --porcelain -uall`: the new name of a rename, without the deleted ones.
const changedFiles = (status: string): string[] =>
  status
    .split('\n')
    .filter(line => line.length > 3 && !line.slice(0, 2).includes('D'))
    .map(line => (line.slice(3).split(' -> ').pop() ?? '').replace(/^"|"$/g, ''))
    .filter(path => path !== '')

const report = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const status = await git($, ['status', '--porcelain', '-uall'])
  const known = await git($, ['ls-files', '--cached', '--others', '--exclude-standard'])

  if (status === undefined || known === undefined) {
    return { text: s.noGit }
  }

  const tested = new Set(
    known
      .split('\n')
      .filter(path => TEST_FILE.test(normal(path)))
      .map(stemOf),
  )
  const code = changedFiles(status)
    .map(normal)
    .filter(path => CODE.test(path) && !TEST_FILE.test(path) && !GENERATED.test(path))
  const missing = code.filter(path => !tested.has(stemOf(path))).sort()

  if (code.length === 0) {
    return { text: s.noChanges }
  }

  if (missing.length === 0) {
    return { text: s.covered(code.length) }
  }

  const more = missing.length > MAX_LISTED ? [`  … +${missing.length - MAX_LISTED}`] : []

  return { text: [s.header(missing.length), ...missing.slice(0, MAX_LISTED).map(path => `  ${path}`), ...more].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'untested', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'untested' }, $ => report($))
}
