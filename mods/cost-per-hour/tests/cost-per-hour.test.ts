import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const MINUTE = 60000

const measure = (usd: number | undefined) => ({
  context: { window: 200000 },
  rateLimits: [],
  ...(usd === undefined ? {} : { cost: { usd } }),
  changed: ['cost' as const],
})

// The world beneath the mod: the session began at time zero, and the status line is recorded.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits: [] } }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('shows the cost per hour of the session', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const status = world(on)

  await clock.advance(30 * MINUTE)
  await $.session.measure(measure(2))
  expect(status.at(-1)).toBe('rate US$ 4.00/h')

  await clock.advance(30 * MINUTE)
  await $.session.measure(measure(3))
  expect(status.at(-1)).toBe('rate US$ 3.00/h')
})

test('shows nothing in the first minutes or with no cost', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const status = world(on)

  await clock.advance(2 * MINUTE)
  await $.session.measure(measure(1))
  await $.session.measure(measure(undefined))
  expect(status).toEqual([])

})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['cost-per-hour'], version: 1 } }))

  await clock.advance(30 * MINUTE)
  await $.session.measure(measure(1))
  expect(status).toEqual([undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await clock.advance(60 * MINUTE)
  await $.session.measure(measure(1.5))
  expect(status.at(-1)).toBe('ritmo US$ 1.50/h')
})
