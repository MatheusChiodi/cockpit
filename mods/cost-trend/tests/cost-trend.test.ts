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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await run($, [0.25, 0.05])
  expect(status.at(-1)).toBe('últimos 2 US$ 0.30')
})

test('a cost measured before the first turn shows nothing but sets the baseline', async ($, on) => {
  const status = world(on)

  await $.session.measure(measure(2))
  expect(status).toEqual([])

  await $.turn.start({ text: 'p', turnId: 't0' })
  await $.session.measure(measure(2.4))
  expect(status.at(-1)).toBe('last 1 US$ 0.40')
})

test('several measures in one turn add up, and a total that goes down adds nothing', async ($, on) => {
  const status = world(on)

  await $.turn.start({ text: 'p', turnId: 't0' })
  await $.session.measure(measure(0.1))
  await $.session.measure(measure(0.3))
  expect(status.at(-1)).toBe('last 1 US$ 0.30')

  await $.session.measure(measure(0.2))
  expect(status.at(-1)).toBe('last 1 US$ 0.30')
})

test('a steady spend shows no arrow', async ($, on) => {
  const status = world(on)

  await run($, Array.from({ length: 10 }, () => 0.1))
  expect(status.at(-1)).toBe('last 10 US$ 1.00')
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['cost-trend'], version: 1 } }))

  await run($, [0.5])
  expect(status).toEqual([undefined])
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: On) => {
    on('command.run', { command: 'flip' }, async ($, e) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['cost-trend'] : [])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  const status = world(on)

  await run($, [0.5])
  expect(status.at(-1)).toBe('last 1 US$ 0.50')

  await $.command.run({ command: 'flip', args: 'off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.at(-1)).toBeUndefined()
})
