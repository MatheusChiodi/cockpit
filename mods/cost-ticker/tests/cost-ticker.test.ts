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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.measure(measure(0.333))
  expect(status.at(-1)).toBe('turno US$ 0.33 · sesión US$ 0.33')
})

test('keeps counting the same turn across several measurements', async ($, on) => {
  const status = world(on)

  await $.session.measure(measure(1))
  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.session.measure(measure(1.4))
  await $.session.measure(measure(2.1))
  expect(status.at(-1)).toBe('turn US$ 1.10 · session US$ 2.10')

  // A turn that has not cost anything yet reads zero.
  await $.turn.start({ text: 'again', turnId: 't-3' })
  await $.session.measure(measure(2.1))
  expect(status.at(-1)).toBe('turn US$ 0.00 · session US$ 2.10')
})

test('never shows a negative turn when the total drops', async ($, on) => {
  const status = world(on)

  await $.session.measure(measure(3))
  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.session.measure(measure(0.2))
  expect(status.at(-1)).toBe('turn US$ 0.00 · session US$ 0.20')
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: any) => {
    on('command.run', { command: 'flip' }, async ($: any) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, ['cost-ticker'])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  const status = world(on)

  await $.session.measure(measure(1))
  expect(status.at(-1)).toBe('turn US$ 1.00 · session US$ 1.00')

  await $.command.run({ command: 'flip', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.at(-1)).toBeUndefined()

  await $.session.measure(measure(2))
  expect(status.at(-1)).toBeUndefined()
})
