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

test('extends a streak kept in the store from yesterday and keeps the best', async ($, on) => {
  const yesterday = new Date(NOON - DAY)
  const day = [yesterday.getFullYear(), String(yesterday.getMonth() + 1).padStart(2, '0'), String(yesterday.getDate()).padStart(2, '0')].join('-')
  mock.store(on, { streak: { day, count: 4, best: 9 } })
  mock.clock(on, { now: NOON })
  const toasts: string[] = []
  sessions(on, toasts)

  await $.session.start(START)
  expect(toasts).toEqual(['◆ 5 days in a row with Claude Code (best: 9)'])
})

test('starts over from a broken store value', async ($, on) => {
  mock.store(on, { streak: 'broken' })
  mock.clock(on, { now: NOON })
  const toasts: string[] = []
  sessions(on, toasts)

  expect((await $.command.run(STREAK)).text).toBe('No streak started yet.')
  await $.session.start(START)
  expect(toasts).toEqual(['◆ 1 day in a row with Claude Code (best: 1)'])
})

test('counts the next day even a minute after midnight', async ($, on) => {
  mock.store(on)
  const late = new Date(2026, 5, 15, 23, 59).getTime()
  const clock = mock.clock(on, { now: late })
  const toasts: string[] = []
  sessions(on, toasts)

  await $.session.start(START)
  await clock.advance(2 * 60000)
  await $.session.start(START)
  expect(toasts.at(-1)).toBe('◆ 2 days in a row with Claude Code (best: 2)')
})

test('speaks Spanish, singular and plural', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: NOON })
  const toasts: string[] = []
  sessions(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(STREAK)).text).toBe('Aún no has empezado una racha.')
  await $.session.start(START)
  expect(toasts.at(-1)).toBe('◆ 1 día seguido con Claude Code (récord: 1)')
  await clock.advance(DAY)
  await $.session.start(START)
  expect(toasts.at(-1)).toBe('◆ 2 días seguidos con Claude Code (récord: 2)')
})

test('speaks Portuguese in the plural', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: NOON })
  sessions(on, [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  await $.session.start(START)
  await clock.advance(DAY)
  await $.session.start(START)
  expect((await $.command.run(STREAK)).text).toBe('◆ 2 dias seguidos de Claude Code (recorde: 2)')
})
