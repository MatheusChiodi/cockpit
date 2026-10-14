import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'


const measure = (usd: number | undefined) => ({
  context: { window: 200000 },
  rateLimits: [],
  ...(usd === undefined ? {} : { cost: { usd } }),
  changed: ['cost' as const],
})

// The world beneath the mod: answers the measurement and the turn, and records the status line.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('shows what the last turn cost next to the session total', async ($, on) => {
  const status = world(on)

  await $.session.measure(measure(0.5))
  expect(status.at(-1)).toBe('turn US$ 0.50 · session US$ 0.50')

  await $.turn.start({ text: 'next', turnId: 't-2' })
  await $.session.measure(measure(1.25))
  expect(status.at(-1)).toBe('turn US$ 0.75 · session US$ 1.25')
})

test('shows nothing when the host keeps no cost ledger', async ($, on) => {
  const status = world(on)

  await $.session.measure(measure(undefined))
  expect(status).toEqual([])
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['cost-ticker'], version: 1 } }))

  await $.session.measure(measure(2))
  expect(status).toEqual([undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.measure(measure(2))
  expect(status.at(-1)).toBe('turno US$ 2.00 · sessão US$ 2.00')
})
