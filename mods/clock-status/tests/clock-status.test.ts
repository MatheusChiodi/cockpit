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
