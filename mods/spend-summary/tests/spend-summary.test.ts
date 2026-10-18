import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const
const MINUTE = 60000

const done = { answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const
const end = { reason: 'other', sessionId: 's1', resume: { id: 's1' } } as const

const measure = (usd: number) => ({ context: { window: 200000 }, rateLimits: [], cost: { usd }, changed: ['cost' as const] })

// The world beneath the mod: the session began at time zero, and every notification is recorded.
const world = (on: On, sent: string[]) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.end', () => ({ sessionId: 's1' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits: [] } }))
  on('ui.notify', (_$, e) => {
    sent.push(e.text)

    return SENT
  })
}

test('sums up the spend when the session ends', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const sent: string[] = []
  world(on, sent)

  await $.turn.complete(done)
  await $.turn.complete({ ...done, agentId: 'a1' })
  await $.session.measure(measure(1.2))
  await $.turn.complete(done)
  await $.session.measure(measure(3))
  await clock.advance(95 * MINUTE)

  await $.session.end(end)
  expect(sent).toEqual(['Session spend US$ 3.00 over 1h 35m, 2 turns (US$ 1.50 each)'])
})

test('stays quiet for a session with no cost or no turn, and starts over after an end', async ($, on) => {
  mock.clock(on, { now: 0 })
  const sent: string[] = []
  world(on, sent)

  await $.session.end(end)
  await $.turn.complete(done)
  await $.session.end(end)
  expect(sent).toEqual([])

  await $.session.measure(measure(2))
  await $.session.end(end)
  expect(sent).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const sent: string[] = []
  world(on, sent)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.complete(done)
  await $.session.measure(measure(0.5))
  await clock.advance(10 * MINUTE)
  await $.session.end(end)
  expect(sent).toEqual(['Gasto da sessão US$ 0.50 em 10m, 1 turno (US$ 0.50 cada)'])
})

test('leaves interrupted turns out and keeps the last cost when a measure has none', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const sent: string[] = []
  world(on, sent)

  await $.turn.complete(done)
  await $.turn.complete({ ...done, isAborted: true, reason: 'aborted' })
  await $.session.measure(measure(4))
  await $.session.measure({ context: { window: 200000 }, rateLimits: [], changed: ['context' as const] } as never)
  await clock.advance(30 * MINUTE)
  await $.session.end(end)

  expect(sent).toEqual(['Session spend US$ 4.00 over 30m, 1 turn (US$ 4.00 each)'])
})

test('rounds a short session up to one minute', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const sent: string[] = []
  world(on, sent)

  await $.turn.complete(done)
  await $.session.measure(measure(0.004))
  await clock.advance(10000)
  await $.session.end(end)

  expect(sent).toEqual(['Session spend US$ 0.00 over 1m, 1 turn (US$ 0.00 each)'])
})

test('falls back to one minute when the session usage is not available', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const sent: string[] = []
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.end', () => ({ sessionId: 's1' }))
  on('session.usage', () => ({ deny: 'not here' }))
  on('ui.notify', (_$, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete(done)
  await $.session.measure(measure(1))
  await clock.advance(120 * MINUTE)
  await $.session.end(end)

  expect(sent).toEqual(['Session spend US$ 1.00 over 1m, 1 turn (US$ 1.00 each)'])
})

test('counts the next session from zero after an end', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const sent: string[] = []
  world(on, sent)

  await $.turn.complete(done)
  await $.turn.complete(done)
  await $.session.measure(measure(2))
  await $.session.end(end)
  await $.turn.complete(done)
  await $.session.measure(measure(0.3))
  await clock.advance(MINUTE)
  await $.session.end(end)

  expect(sent).toEqual(['Session spend US$ 2.00 over 1m, 2 turns (US$ 1.00 each)', 'Session spend US$ 0.30 over 1m, 1 turn (US$ 0.30 each)'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const sent: string[] = []
  world(on, sent)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.turn.complete(done)
  await $.turn.complete(done)
  await $.session.measure(measure(3))
  await clock.advance(61 * MINUTE)
  await $.session.end(end)
  expect(sent).toEqual(['Gasto de la sesión US$ 3.00 en 1h 01m, 2 turnos (US$ 1.50 cada uno)'])
})
