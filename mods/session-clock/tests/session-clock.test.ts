import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const START = { cwd: '/p', surface: 'terminal', isInteractive: true } as const

const COMPLETE = {
  text: 'ok',
  reason: 'answer',
  answer: 'ok',
  durationMs: 1000,
  isAborted: false,
  turnId: 't1',
} as const

const world = (on: Parameters<typeof mock.store>[0], statuses: (string | undefined)[], turns = { count: 0 }) => {
  const clock = mock.clock(on, { now: 5 * 60000 })
  on('session.start', () => ({ cwd: '/p' }))
  on('turn.complete', () => ({ text: 'ok' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1 }, rateLimits: [] } }))
  on('session.turns', () => ({ value: turns.count }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  return clock
}

test('shows elapsed time and prompts, refreshed every 30 seconds and after a turn', async ($, on) => {
  const statuses: (string | undefined)[] = []
  const turns = { count: 0 }
  const clock = world(on, statuses, turns)

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('session 5min · 0 prompts')

  turns.count = 2
  await clock.advance(30000)
  expect(statuses.at(-1)).toBe('session 5min · 2 prompts')

  await clock.advance(60 * 60000)
  expect(statuses.at(-1)).toBe('session 1h05 · 2 prompts')

  turns.count = 3
  await $.turn.complete(COMPLETE)
  expect(statuses.at(-1)).toBe('session 1h05 · 3 prompts')
})

test('never shows a negative time', async ($, on) => {
  const statuses: (string | undefined)[] = []
  mock.clock(on, { now: 0 })
  on('session.start', () => ({ cwd: '/p' }))
  on('session.usage', () => ({ value: { startedAt: 60000, context: { window: 1 }, rateLimits: [] } }))
  on('session.turns', () => ({ value: 0 }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('session 0min · 0 prompts')
})

test('speaks the language set in the hub', async ($, on) => {
  const statuses: (string | undefined)[] = []
  world(on, statuses)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)

  await $.session.start(START)
  expect(statuses.at(-1)).toBe('sessão 5min · 0 prompts')
})
