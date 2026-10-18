import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

// Local time on 2026-10-13 (a Tuesday), whatever the machine's zone.
const at = (hours: number, minutes: number): number => new Date(2026, 9, 13, hours, minutes).getTime()

const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('shows the day and the time, and keeps them current', async ($, on) => {
  const clock = mock.clock(on, { now: at(14, 5) })
  const status = world(on)

  await $.session.start(START)
  expect(status.at(-1)).toMatch(/^Tue,? 10\/13 · 0?2:05 PM$/)

  await clock.advance(60 * MINUTE)
  expect(status.at(-1)).toMatch(/0?3:05 PM$/)
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on, { now: at(14, 5) })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['clock-status'], version: 1 } }))

  await $.session.start(START)
  await clock.advance(MINUTE)
  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('formats the date in the language set in the hub', async ($, on) => {
  mock.clock(on, { now: at(14, 5) })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toMatch(/^ter,? 13\/10 · 14:05$/)
})

test('formats the date in Spanish when the hub language is es', async ($, on) => {
  mock.clock(on, { now: at(9, 30) })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toMatch(/^mar,? 13\/10 · 0?9:30$/)
})

test('refreshes every 20 seconds', async ($, on) => {
  const clock = mock.clock(on, { now: at(14, 5) })
  const status = world(on)

  await $.session.start(START)
  const first = status.length
  await clock.advance(MINUTE)

  expect(status.length - first).toBe(3)
})

test('comes back on the next tick once the hub turns it on again', async ($, on) => {
  const clock = mock.clock(on, { now: at(14, 5) })
  const status = world(on)
  let off = ['clock-status']
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toBeUndefined()

  off = []
  await clock.advance(20000)
  expect(status.at(-1)).toMatch(/0?2:05 PM$/)
})

test('rolls the day over at midnight', async ($, on) => {
  const clock = mock.clock(on, { now: at(23, 59) })
  const status = world(on)

  await $.session.start(START)
  expect(status.at(-1)).toMatch(/^Tue,? 10\/13 · 11:59 PM$/)

  await clock.advance(2 * MINUTE)
  expect(status.at(-1)).toMatch(/^Wed,? 10\/14 · 12:0[01] AM$/)
})
