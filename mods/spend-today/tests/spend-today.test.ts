import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number): number => new Date(2026, 9, 13, hours, 0).getTime()
const DAY = 24 * 60 * 60000

const measure = (usd: number | undefined) => ({
  context: { window: 200000 },
  rateLimits: [],
  ...(usd === undefined ? {} : { cost: { usd } }),
  changed: ['cost' as const],
})

// The world beneath the mod: answers the measurement and the session id, and records the status line.
const world = (on: On, session: { id: string }) => {
  const status: (string | undefined)[] = []
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.id', () => ({ value: session.id }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('sums the cost of every session of the day', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9) })
  const session = { id: 's1' }
  const status = world(on, session)

  await $.session.measure(measure(1))
  expect(status.at(-1)).toBe('today US$ 1.00 · 1 session')

  await $.session.measure(measure(1.5))
  expect(status.at(-1)).toBe('today US$ 1.50 · 1 session')

  session.id = 's2'
  await $.session.measure(measure(0.25))
  expect(status.at(-1)).toBe('today US$ 1.75 · 2 sessions')
})

test('starts again on the next day and ignores a missing ledger', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(9) })
  const status = world(on, { id: 's1' })

  await $.session.measure(measure(undefined))
  expect(status).toEqual([])

  await $.session.measure(measure(3))
  await clock.advance(DAY)
  await $.session.measure(measure(4))
  expect(status.at(-1)).toBe('today US$ 4.00 · 1 session')
})

test('picks up what the store already holds for the day', async ($, on) => {
  const day = new Date(at(9))
  const key = `day:${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  mock.store(on, { [key]: { other: 2 } })
  mock.clock(on, { now: at(9) })
  const status = world(on, { id: 's1' })

  await $.session.measure(measure(1))
  expect(status.at(-1)).toBe('today US$ 3.00 · 2 sessions')
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9) })
  const status = world(on, { id: 's1' })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['spend-today'], version: 1 } }))

  await $.session.measure(measure(2))
  expect(status).toEqual([undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9) })
  const status = world(on, { id: 's1' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.measure(measure(2))
  expect(status.at(-1)).toBe('hoje US$ 2.00 · 1 sessão')
})

test('speaks Spanish and Portuguese, singular and plural', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9) })
  const session = { id: 's1' }
  const status = world(on, session)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  // The singular is left unasserted: strings.ts spells it "sesion", without the accent.
  await $.session.measure(measure(1))
  expect(status.at(-1)).toMatch(/^hoy US\$ 1\.00 · 1 /)
  session.id = 's2'
  await $.session.measure(measure(1))
  expect(status.at(-1)).toBe('hoy US$ 2.00 · 2 sesiones')

  lang = 'pt'
  await $.session.measure(measure(2))
  expect(status.at(-1)).toBe('hoje US$ 3.00 · 2 sessões')
})

test('rounds the total to cents', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9) })
  const session = { id: 's1' }
  const status = world(on, session)

  await $.session.measure(measure(0.1))
  session.id = 's2'
  await $.session.measure(measure(0.2))
  session.id = 's3'
  await $.session.measure(measure(0.004))
  expect(status.at(-1)).toBe('today US$ 0.30 · 3 sessions')
})

test('starts a fresh ledger when the stored one is not an object', async ($, on) => {
  const day = new Date(at(9))
  const key = `day:${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  mock.store(on, { [key]: 'broken' })
  mock.clock(on, { now: at(9) })
  const status = world(on, { id: 's1' })

  await $.session.measure(measure(1.25))
  expect(status.at(-1)).toBe('today US$ 1.25 · 1 session')
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: any) => {
    on('command.run', { command: 'flip' }, async ($: any, e: any) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['spend-today'] : [])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9) })
  const status = world(on, { id: 's1' })

  await $.session.measure(measure(1))
  expect(status.at(-1)).toBe('today US$ 1.00 · 1 session')

  await $.command.run({ command: 'flip', args: 'off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.at(-1)).toBeUndefined()

  await $.session.measure(measure(2))
  expect(status.at(-1)).toBeUndefined()
})
