import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

const run = (args: string) => ({
  command: 'target',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number): number => new Date(2026, 9, 13, hours, 0).getTime()

type World = { toasts: string[]; commits: number; argvs: string[][] }

// The world beneath the mod: answers git with `commits` lines, and records every toast.
const world = (on: On): World => {
  const seen: World = { toasts: [], commits: 0, argvs: [] }
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: '/project' }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('process.run', (_$, e) => {
    seen.argvs.push([...e.argv])
    const stdout = e.argv[1] === 'config' ? 'me@example.com\n' : Array.from({ length: seen.commits }, (_, i) => `hash${i}\n`).join('')

    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.toast', (_$, e) => {
    seen.toasts.push(e.text)

    return { value: undefined }
  })

  return seen
}

test('toasts at half and at the target, once each', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(10) })
  const seen = world(on)

  await $.session.start(START)
  expect((await $.command.run(run('4 commits'))).text).toBe('Daily target set: 4 commits')

  seen.commits = 1
  await $.turn.complete(TURN)
  expect(seen.toasts).toHaveLength(0)

  seen.commits = 2
  await $.turn.complete(TURN)
  expect(seen.toasts).toEqual(['Halfway there: 2 of 4 commits today'])

  await $.turn.complete(TURN)
  expect(seen.toasts).toHaveLength(1)

  seen.commits = 4
  await $.turn.complete(TURN)
  expect(seen.toasts).toEqual(['Halfway there: 2 of 4 commits today', 'Target reached: 4 of 4 commits today'])

  seen.commits = 5
  await $.turn.complete(TURN)
  expect(seen.toasts).toHaveLength(2)
})

test('asks git for your own commits since midnight', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(10) })
  const seen = world(on)

  await $.session.start(START)
  await $.command.run(run('2'))
  seen.commits = 1
  await $.turn.complete(TURN)

  expect(seen.argvs).toContainEqual(['git', 'config', 'user.email'])
  expect(seen.argvs).toContainEqual([
    'git',
    'log',
    '--all',
    '--since=midnight',
    '--fixed-strings',
    '--author=me@example.com',
    '--format=%H',
  ])
})

test('a new day starts the toasts over', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(10) })
  const seen = world(on)

  await $.session.start(START)
  await $.command.run(run('1 commit'))
  seen.commits = 1
  await $.turn.complete(TURN)
  expect(seen.toasts).toEqual(['Target reached: 1 of 1 commits today'])

  await clock.set(at(10) + 24 * 60 * 60000)
  await $.turn.complete(TURN)
  expect(seen.toasts).toHaveLength(2)
})

test('off removes the target; bad input shows the usage', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(10) })
  const seen = world(on)

  await $.session.start(START)
  expect((await $.command.run(run(''))).text).toContain('No daily target')

  for (const args of ['0', '99 commits', 'many', '3 pizzas']) {
    expect((await $.command.run(run(args))).text, args).toContain('Usage')
  }

  await $.command.run(run('2 commits'))
  seen.commits = 1
  expect((await $.command.run(run(''))).text).toBe('Daily target: 1 of 2 commits today.')

  expect((await $.command.run(run('off'))).text).toBe('Daily target removed.')
  seen.commits = 5
  await $.turn.complete(TURN)
  expect(seen.toasts).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(10) })
  const seen = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await $.command.run(run('2 commits'))
  seen.commits = 2
  await $.turn.complete(TURN)

  expect(seen.toasts).toEqual(['Meta atingida: 2 de 2 commits hoje'])
})
