import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const MINUTE = 60000
const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

const measure = (percent: number) => ({
  context: { window: 200000, percent },
  rateLimits: [],
  changed: ['context' as const],
})

const send = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } as const })

// The world beneath the mod: measurement, turn end and prompt go through, and the toasts are recorded.
const world = (on: On) => {
  const toasts: string[] = []
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('toasts when a prompt comes after the cache window with a large context', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const toasts = world(on)

  await $.session.measure(measure(46))
  await $.turn.complete(TURN)
  await clock.advance(14 * MINUTE)
  await $.prompt.submit(send('now add the tests'))

  expect(toasts).toEqual(['Prompt cache expired after 14 min idle: this turn re-reads about 92,000 tokens'])
})

test('stays quiet within 5 minutes, for a small context and for a slash command', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const toasts = world(on)

  await $.session.measure(measure(46))
  await $.turn.complete(TURN)
  await clock.advance(3 * MINUTE)
  await $.prompt.submit(send('quick one'))

  await clock.advance(20 * MINUTE)
  await $.prompt.submit(send('/status'))

  await $.session.measure(measure(5))
  await $.prompt.submit(send('small context'))

  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const toasts = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.measure(measure(50))
  await $.turn.complete(TURN)
  await clock.advance(10 * MINUTE)
  await $.prompt.submit(send('segue'))

  expect(toasts).toEqual(['Cache de prompt expirou após 10 min parado: este turno relê cerca de 100.000 tokens'])
})
