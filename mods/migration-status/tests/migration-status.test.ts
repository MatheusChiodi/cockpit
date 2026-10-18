import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

declare const setTimeout: (run: () => void, ms: number) => unknown

// The status line is written unawaited by the mod: give it a moment to land.
const flush = () => new Promise(resolve => setTimeout(() => resolve(undefined), 30))

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// `git status --porcelain` for the migration folders; null stands for "not a repository".
const world = (on: any, porcelain: string | null, off: string[] = [], lang = 'en') => {
  mock.clock(on)
  const status: (string | undefined)[] = []

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('process.run', () => (porcelain === null ? done(128) : done(0, porcelain)))
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

test('counts the migration files created and not yet committed', async ($, on) => {
  const status = world(on, '?? prisma/migrations/20260101_add_users/migration.sql\nA  db/migrate/002_orders.rb\n')

  await started($)
  expect(status.at(-1)).toBe('migrations 2 new')
})

test('counts edited migrations apart from the new ones', async ($, on) => {
  const status = world(on, '?? migrations/003_x.sql\n M migrations/001_init.sql\n')

  await started($)
  expect(status.at(-1)).toBe('migrations 1 new · 1 edited')
})

test('shows nothing with no migration change', async ($, on) => {
  const status = world(on, '')

  await started($)
  expect(status).toEqual([])
})

test('shows nothing outside a git repository', async ($, on) => {
  const status = world(on, null)

  await started($)
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, '?? migrations/003_x.sql\n', ['migration-status'])

  await started($)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, '?? migrations/003_x.sql\n M migrations/001_init.sql\n', [], 'pt')

  await started($)
  expect(status.at(-1)).toBe('migrations 1 nova · 1 editada')
})

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// A repository whose porcelain output and hub switch the test changes as it goes; returns the status line written.
const live = (on: any) => {
  mock.clock(on)
  const repo = { porcelain: '', off: [] as string[], runs: 0 }
  const status: (string | undefined)[] = []

  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/repo' }))
  on('process.run', () => {
    repo.runs += 1

    return done(0, repo.porcelain)
  })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: repo.off, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  return { repo, status }
}

test('speaks Spanish, with plurals', async ($, on) => {
  const status = world(on, '?? migrations/003_x.sql\n?? migrations/004_y.sql\n M migrations/001_init.sql\n', [], 'es')

  await started($)
  expect(status.at(-1)).toBe('migrations 2 nuevas · 1 editada')
})

test('ignores deleted and renamed-only entries', async ($, on) => {
  const status = world(on, ' D migrations/001_init.sql\nR  migrations/a.sql -> migrations/b.sql\n')

  await started($)
  expect(status).toEqual([])
})

test('refreshes after a migration command or a write in a migration folder, not after other commands', async ($, on) => {
  const { repo, status } = live(on)

  await started($)
  expect(status).toEqual([])

  repo.porcelain = '?? prisma/migrations/1_init/migration.sql\n'
  await $.tool.call({ tool: 'Bash', command: 'ls -la', tool_use_id: 'b1' })
  await flush()
  expect(status).toEqual([])

  await $.tool.call({ tool: 'Bash', command: 'npx prisma migrate dev', tool_use_id: 'b2' })
  await flush()
  expect(status.at(-1)).toBe('migrations 1 new')

  repo.porcelain = '?? prisma/migrations/1_init/migration.sql\n?? db/migrations/2.sql\n'
  await $.tool.call({ tool: 'Write', file_path: '/repo/db/migrations/2.sql', content: 'create table t ();', tool_use_id: 'w1' })
  await flush()
  expect(status.at(-1)).toBe('migrations 2 new')

  repo.porcelain = ''
  await $.tool.call({ tool: 'PowerShell', command: 'alembic upgrade head', tool_use_id: 'p1' })
  await flush()
  expect(status.at(-1)).toBeUndefined()
})

test('does not write the same entry twice', async ($, on) => {
  const { repo, status } = live(on)
  repo.porcelain = '?? migrations/003_x.sql\n'

  await started($)
  await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 'b1' })
  await flush()

  expect(repo.runs).toBe(2)
  expect(status).toEqual(['migrations 1 new'])
})
