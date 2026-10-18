import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Repo = { env: string[]; tracked: string[]; ignored: string[]; isRepo?: boolean }

const last: { clock?: ReturnType<typeof mock.clock> } = {}

const world = (on: any, repo: Repo, off: string[] = [], lang = 'en') => {
  last.clock = mock.clock(on)
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

test('leaves .env.example out: it is meant to be committed', async ($, on) => {
  const status = world(on, { env: ['.env.example'], tracked: ['.env.example'], ignored: [] })

  await started($)
  expect(status).toEqual([])
})

test('looks again after a git command and clears the warning once the file is ignored', async ($, on) => {
  const repo: Repo = { env: ['.env.local'], tracked: [], ignored: [] }
  const status = world(on, repo)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await started($)
  expect(status.at(-1)).toBe('env ✗ .env.local not ignored')

  repo.ignored.push('.env.local')
  await $.tool.call({ tool: 'Bash', command: 'git rm --cached .env.local', tool_use_id: 'b-1' })
  await flush()
  expect(status.at(-1)).toBeUndefined()
})

test('looks again after .gitignore is written', async ($, on) => {
  const repo: Repo = { env: ['.env'], tracked: [], ignored: [] }
  const status = world(on, repo)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  await started($)
  repo.ignored.push('.env')
  await $.tool.call({ tool: 'Write', file_path: '/repo/.gitignore', content: '.env\n', tool_use_id: 'w-1' })
  await flush()
  expect(status.at(-1)).toBeUndefined()
})

test('writing an unrelated file does not look again', async ($, on) => {
  const repo: Repo = { env: ['.env'], tracked: [], ignored: [] }
  const status = world(on, repo)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  await started($)
  const before = status.length
  repo.ignored.push('.env')
  await $.tool.call({ tool: 'Write', file_path: '/repo/src/app.ts', content: 'x', tool_use_id: 'w-2' })
  await flush()
  expect(status.length).toBe(before)
  expect(status.at(-1)).toBe('env ✗ .env not ignored')
})

test('refreshes on its two minute timer', async ($, on) => {
  const repo: Repo = { env: ['.env'], tracked: [], ignored: [] }
  const status = world(on, repo)

  const clock = last.clock as ReturnType<typeof mock.clock>

  await started($)
  expect(status.at(-1)).toBe('env ✗ .env not ignored')

  repo.tracked.push('.env')
  await clock.advance(120000)
  await flush()
  expect(status.at(-1)).toBe('env ✗ .env tracked by git')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on, { env: ['.env', '.env.production'], tracked: ['.env.production'], ignored: ['.env'] }, [], 'es')

  await started($)
  expect(status.at(-1)).toBe('env ✗ .env.production rastreado por git')
})
