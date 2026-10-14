import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const measure = (usd: number | undefined) => ({
  context: { window: 200000 },
  rateLimits: [],
  ...(usd === undefined ? {} : { cost: { usd } }),
  changed: ['cost' as const],
})

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

// Runs one turn per cost, each adding it to the session total.
const run = async ($: any, costs: number[], from = 0) => {
  let total = from

  for (const [at, cost] of costs.entries()) {
    await $.turn.start({ text: `p${at}`, turnId: `t${at}` })
    total += cost
    await $.session.measure(measure(total))
  }
}

test('sums the last ten turns and shows the trend', async ($, on) => {
  const status = world(on)

  await run($, [0.1, 0.1, 0.1])
  expect(status.at(-1)).toBe('last 3 US$ 0.30')

  await run($, [0.1, 0.1, 0.5, 0.5, 0.5, 0.5, 0.5], 0.3)
  expect(status.at(-1)).toBe('last 10 US$ 3.00 ↑')
})

test('shows a fall, and forgets turns older than ten', async ($, on) => {
  const status = world(on)

  await run($, [1, 1, 1, 1, 1, 0.1, 0.1, 0.1, 0.1, 0.1])
  expect(status.at(-1)).toBe('last 10 US$ 5.50 ↓')

  await run($, [0.1, 0.1, 0.1, 0.1, 0.1], 5.5)
  expect(status.at(-1)).toBe('last 10 US$ 1.00')
})

test('shows nothing with no cost ledger', async ($, on) => {
  const status = world(on)

  await $.turn.start({ text: 'p', turnId: 't0' })
  await $.session.measure(measure(undefined))
  expect(status).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await run($, [0.2])
  expect(status.at(-1)).toBe('últimos 1 US$ 0.20')
})
