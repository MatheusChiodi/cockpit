import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Repo = { env: string[]; tracked: string[]; ignored: string[]; isRepo?: boolean }

const world = (on: any, repo: Repo, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const status: (string | undefined)[] = []
  const key = (path: string) => path.replaceAll('\\', '/').replace(/^.*\/repo\//, '')

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: repo.env.includes(key(e.path)) }))
  on('process.run', (_: unknown, e: { argv: string[] }) => {
    if (repo.isRepo === false) {
      return done(128)
    }

    return e.argv[2] === 'ls-files' ? done(0, repo.tracked.join('\n')) : done(repo.ignored.length === 0 ? 1 : 0, repo.ignored.join('\n'))
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

test('warns when a .env file is not in .gitignore', async ($, on) => {
  const status = world(on, { env: ['.env'], tracked: [], ignored: [] })

  await started($)
  expect(status.at(-1)).toBe('env ✗ .env not ignored')
})

test('warns when a .env file is tracked, even if the ignore rule exists', async ($, on) => {
  const status = world(on, { env: ['.env'], tracked: ['.env'], ignored: ['.env'] })

  await started($)
  expect(status.at(-1)).toBe('env ✗ .env tracked by git')
})

test('counts the other files after the first', async ($, on) => {
  const status = world(on, { env: ['.env', '.env.local', '.env.production'], tracked: ['.env.production'], ignored: ['.env.local'] })

  await started($)
  expect(status.at(-1)).toBe('env ✗ .env.production tracked by git +1')
})

test('shows nothing when every env file is ignored and untracked', async ($, on) => {
  const status = world(on, { env: ['.env', '.env.local'], tracked: [], ignored: ['.env', '.env.local'] })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing without env files', async ($, on) => {
  const none = world(on, { env: [], tracked: [], ignored: [] })

  await started($)
  expect(none).toEqual([])
})

test('shows nothing outside a git repository', async ($, on) => {
  const status = world(on, { env: ['.env'], tracked: [], ignored: [], isRepo: false })

  await started($)
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, { env: ['.env'], tracked: [], ignored: [] }, ['env-ignore-status'])

  await started($)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, { env: ['.env'], tracked: [], ignored: [] }, [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('env ✗ .env fora do .gitignore')
})
