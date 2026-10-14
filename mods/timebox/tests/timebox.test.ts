import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

const run = (args: string) => ({
  command: 'timebox',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

type Seen = { toasts: string[]; notes: string[]; status: (string | undefined)[] }

// The world beneath the mod: answers the session and the command, and records toasts, notifications and the status line.
const world = (on: On): Seen => {
  const seen: Seen = { toasts: [], notes: [], status: [] }
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    seen.toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_$, e) => {
    seen.notes.push(e.text)

    return { value: { isSent: true, channel: 'kitty' } }
  })
  on('ui.status', (_$, e) => {
    seen.status.push(e.text)

    return { value: undefined }
  })

  return seen
}

test('counts down, warns at 80% and notifies when the time runs out', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const seen = world(on)

  await $.session.start(START)
  const started = await $.command.run(run('10 fix the login bug'))
  expect(started.text).toBe('Time box of 10 min started: fix the login bug')
  expect(seen.status.at(-1)).toBe('timebox 10 min left · fix the login bug')

  await clock.advance(5 * MINUTE)
  expect(seen.status.at(-1)).toBe('timebox 5 min left · fix the login bug')
  expect(seen.toasts).toHaveLength(0)

  await clock.advance(3 * MINUTE)
  expect(seen.toasts).toEqual(['80% of the box is gone, 2 min left: fix the login bug'])

  await clock.advance(2 * MINUTE)
  expect(seen.toasts).toHaveLength(2)
  expect(seen.toasts[1]).toBe('Time is up: fix the login bug')
  expect(seen.notes).toEqual(['Time is up: fix the login bug'])
  expect(seen.status.at(-1)).toBeUndefined()
})

test('done closes the box and says how long it took', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const seen = world(on)

  await $.session.start(START)
  expect((await $.command.run(run('done'))).text).toBe('No time box is running.')

  await $.command.run(run('30 write the report'))
  await clock.advance(12 * MINUTE)

  const closed = await $.command.run(run('done'))
  expect(closed.text).toBe('Time box closed after 12 of 30 min: write the report')
  expect(seen.status.at(-1)).toBeUndefined()

  await clock.advance(60 * MINUTE)
  expect(seen.notes).toHaveLength(0)
})

test('a box in the store is taken up by the next session without warning twice', async ($, on) => {
  mock.store(on, { timebox: { startedAt: 0, endsAt: 10 * MINUTE, what: 'review' } })
  const clock = mock.clock(on, { now: 9 * MINUTE })
  const seen = world(on)

  await $.session.start(START)
  expect(seen.status.at(-1)).toBe('timebox 1 min left · review')
  expect(seen.toasts).toHaveLength(0)

  await clock.advance(MINUTE)
  expect(seen.toasts).toEqual(['Time is up: review'])
})

test('refuses a bad amount', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  world(on)

  await $.session.start(START)

  for (const args of ['', '20', 'soon task', '0 now', '9999 never']) {
    expect((await $.command.run(run(args))).text, args).toContain('Usage')
  }
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const seen = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await $.command.run(run('20 revisar'))

  expect(seen.status.at(-1)).toBe('timebox 20 min restantes · revisar')
})
