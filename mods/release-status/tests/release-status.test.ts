import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Repo = { files: Record<string, string>; tag: string | null; count: number }

const world = (on: any, repo: Repo, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const status: (string | undefined)[] = []
  const key = (path: string) => path.replaceAll('\\', '/').replace(/^.*\/repo\//, '')

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: repo.files[key(e.path)] as never }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (e.argv[2] === 'describe') {
      return repo.tag === null ? done(128) : done(0, `${repo.tag}\n`)
    }

    return done(0, `${repo.count}\n`)
  })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const started = async ($: any) => {
  await $.session.start(START)
  await flush()
}

const pkg = (version: string) => ({ 'package.json': JSON.stringify({ version }) })

test('shows the version and the commits since the last tag', async ($, on) => {
  const status = world(on, { files: pkg('1.4.0'), tag: 'v1.3.0', count: 12 })

  await started($)
  expect(status.at(-1)).toBe('release 1.4.0 · 12 since v1.3.0')
})

test('says when the version was not bumped since the tag', async ($, on) => {
  const status = world(on, { files: pkg('1.3.0'), tag: 'v1.3.0', count: 5 })

  await started($)
  expect(status.at(-1)).toBe('release 1.3.0 · 5 since v1.3.0 · not bumped')
})

test('says when a bumped version is ready to tag', async ($, on) => {
  const status = world(on, { files: pkg('1.4.0'), tag: 'v1.3.0', count: 0 })

  await started($)
  expect(status.at(-1)).toBe('release 1.4.0 · ready to tag')
})

test('reads the version of Cargo.toml', async ($, on) => {
  const status = world(on, { files: { 'Cargo.toml': '[package]\nname = "x"\nversion = "0.2.0"\n' }, tag: '0.1.0', count: 3 })

  await started($)
  expect(status.at(-1)).toBe('release 0.2.0 · 3 since 0.1.0')
})

test('shows nothing when the tag is the version and nothing came after, or there is no tag', async ($, on) => {
  const status = world(on, { files: pkg('1.3.0'), tag: 'v1.3.0', count: 0 })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing without a tag or without a version', async ($, on) => {
  const status = world(on, { files: pkg('1.0.0'), tag: null, count: 0 })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { files: pkg('1.4.0'), tag: 'v1.3.0', count: 2 }, ['release-status'])

  await started($)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { files: pkg('1.3.0'), tag: 'v1.3.0', count: 2 }, [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('release 1.3.0 · 2 desde v1.3.0 · sem bump')
})
