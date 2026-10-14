import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/repo', surface: null, isInteractive: true } as const
const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const stashes = (count: number) => Array.from({ length: count }, (_, i) => `stash@{${i}}: WIP on main: abc${i} work\n`).join('')

// The world beneath the mod: a fake `git stash list`, the hub's switch, and the status line recorded.
const world = (on: any, list: { stdout: string; exitCode: number }, off: string[] = []) => {
  const clock = mock.clock(on)
  const status: (string | undefined)[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))
  on('process.run', () => done(list.exitCode, list.stdout))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    status.push(e.text)

    return { value: undefined }
  })

  return { clock, status }
}

test('shows how many stashes are forgotten', async ($, on) => {
  const { status } = world(on, { exitCode: 0, stdout: stashes(2) })

  await $.session.start(START)
  expect(status.at(-1)).toBe('stash 2')
})

test('follows the list after a turn and on the minute', async ($, on) => {
  const list = { exitCode: 0, stdout: stashes(1) }
  const { clock, status } = world(on, list)

  await $.session.start(START)
  expect(status.at(-1)).toBe('stash 1')

  list.stdout = stashes(3)
  await $.turn.complete(TURN)
  expect(status.at(-1)).toBe('stash 3')

  list.stdout = ''
  await clock.advance(60000)
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing with no stash or outside a git repository', async ($, on) => {
  const list = { exitCode: 0, stdout: '' }
  const { status } = world(on, list)

  await $.session.start(START)
  expect(status.at(-1)).toBeUndefined()

  list.exitCode = 128
  list.stdout = stashes(2)
  await $.turn.complete(TURN)
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const { status } = world(on, { exitCode: 0, stdout: stashes(2) }, ['stash-status'])

  await $.session.start(START)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})
