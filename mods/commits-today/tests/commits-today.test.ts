import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

const ran = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

type Git = { email: string; log: string; inRepo: boolean; argv: string[][] }

// The world beneath the mod: a fake git, and the status line recorded.
const world = (on: On, git: Git) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('process.run', (_$, e) => {
    git.argv.push([...e.argv])

    if (e.argv.includes('config')) {
      return ran(git.email === '' ? 1 : 0, git.email)
    }

    return git.inRepo ? ran(0, git.log) : ran(128, '')
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const git = (overrides: Partial<Git> = {}): Git => ({ email: 'me@example.com', log: '', inRepo: true, argv: [], ...overrides })

test('counts the commits of the day by the configured author and recounts after a turn', async ($, on) => {
  const fake = git({ log: 'a1 one\nb2 two\n' })
  const status = world(on, fake)

  await $.session.start(START)
  expect(status.at(-1)).toBe('commits 2 today')
  expect(fake.argv.some(argv => argv.includes('--author=me@example.com'))).toBe(true)

  fake.log = 'a1 one\nb2 two\nc3 three\n'
  await $.turn.complete(TURN)
  expect(status.at(-1)).toBe('commits 3 today')
})

test('counts every author when git has no email, and zero on a quiet day', async ($, on) => {
  const fake = git({ email: '' })
  const status = world(on, fake)

  await $.session.start(START)
  expect(status.at(-1)).toBe('commits 0 today')
  expect(fake.argv.some(argv => argv.some(arg => arg.startsWith('--author')))).toBe(false)
})

test('shows nothing outside a git repository', async ($, on) => {
  const status = world(on, git({ inRepo: false }))

  await $.session.start(START)
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on, git({ log: 'a1 one\n' }))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['commits-today'], version: 1 } }))

  await $.session.start(START)
  expect(status).toEqual([undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on, git({ log: 'a1 one\n' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toBe('commits 1 hoje')
})

test('asks git for the commits since midnight only', async ($, on) => {
  const fake = git({ log: 'a1 one\n' })
  world(on, fake)

  await $.session.start(START)
  const log = fake.argv.find(argv => argv.includes('log'))
  expect(log).toEqual(['git', '--no-pager', 'log', '--since=midnight', '--oneline', '--author=me@example.com'])
})

test('counts every author when git config cannot run', async ($, on) => {
  const argv: string[][] = []
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('process.run', (_$, e) => {
    argv.push([...e.argv])

    return e.argv.includes('config') ? { deny: 'not allowed' } : ran(0, 'a1 one\nb2 two\n')
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(status.at(-1)).toBe('commits 2 today')
  expect(argv.some(args => args.some(arg => arg.startsWith('--author')))).toBe(false)
})

test('clears the entry when the repository goes away mid-session', async ($, on) => {
  const fake = git({ log: 'a1 one\n' })
  const status = world(on, fake)

  await $.session.start(START)
  expect(status.at(-1)).toBe('commits 1 today')

  fake.inRepo = false
  await $.turn.complete(TURN)
  expect(status.at(-1)).toBeUndefined()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const status = world(on, git({ log: 'a1 one\nb2 two\n' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toBe('commits 2 hoy')
})
