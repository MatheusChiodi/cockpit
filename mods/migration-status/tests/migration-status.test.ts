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
