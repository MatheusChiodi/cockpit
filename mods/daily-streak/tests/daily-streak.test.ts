import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const DAY = 86400000
// Local noon, so the day is the same in every timezone.
const NOON = new Date(2026, 5, 15, 12).getTime()

const START = { cwd: '/p', surface: 'terminal', isInteractive: true } as const

const STREAK = {
  command: 'streak',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const sessions = (on: Parameters<typeof mock.store>[0], toasts: string[]) => {
  on('session.start', () => ({ cwd: '/p' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('starts a streak, extends it on consecutive days and resets after a gap', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: NOON })
  const toasts: string[] = []
  sessions(on, toasts)

  expect((await $.command.run(STREAK)).text).toBe('No streak started yet.')

  await $.session.start(START)
  expect(toasts.at(-1)).toBe('◆ 1 day in a row with Claude Code (best: 1)')

  // The same day again says nothing new.
  await $.session.start(START)
  expect(toasts).toHaveLength(1)

  await clock.advance(DAY)
  await $.session.start(START)
  expect(toasts.at(-1)).toBe('◆ 2 days in a row with Claude Code (best: 2)')

  await clock.advance(DAY)
  await $.session.start(START)
  expect((await $.command.run(STREAK)).text).toBe('◆ 3 days in a row with Claude Code (best: 3)')

  await clock.advance(3 * DAY)
  await $.session.start(START)
  expect((await $.command.run(STREAK)).text).toBe('◆ 1 day in a row with Claude Code (best: 3)')
})

test('does not toast in a non-interactive session', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: NOON })
  const toasts: string[] = []
  sessions(on, toasts)

  await $.session.start({ ...START, isInteractive: false })
  expect(toasts).toHaveLength(0)
  expect((await $.command.run(STREAK)).text).toContain('1 day in a row')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: NOON })
  const toasts: string[] = []
  sessions(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  expect((await $.command.run(STREAK)).text).toBe('Sequência ainda não iniciada.')
  await $.session.start(START)
  expect(toasts.at(-1)).toBe('◆ 1 dia seguido de Claude Code (recorde: 1)')
})
