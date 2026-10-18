import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number, minutes: number): number => new Date(2026, 9, 13, hours, minutes).getTime()

const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('adds a minute for every minute with recent activity, and stops after five idle ones', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(9, 0) })
  const status = world(on)

  await $.session.start(START)
  expect(status.at(-1)).toBe('active 0h00 today')

  await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })
  await clock.advance(3 * MINUTE)
  expect(status.at(-1)).toBe('active 0h03 today')

  // Five minutes after the last activity the window closes.
  await clock.advance(10 * MINUTE)
  expect(status.at(-1)).toBe('active 0h05 today')
})

test('keeps the day across sessions and rolls over at midnight', async ($, on) => {
  const day = new Date(at(9, 0))
  const key = `minutes:${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  mock.store(on, { [key]: 75 })
  const clock = mock.clock(on, { now: at(23, 0) })
  const status = world(on)

  await $.session.start(START)
  expect(status.at(-1)).toBe('active 1h15 today')

  await clock.advance(2 * 60 * MINUTE)
  expect(status.at(-1)).toBe('active 0h00 today')
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9, 0) })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['day-timer'], version: 1 } }))

  await $.session.start(START)
  expect(status).toEqual([undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9, 0) })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toBe('ativo 0h00 hoje')
})

test('a tool call counts as activity too, and no activity adds nothing', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(9, 0) })
  const status = world(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.session.start(START)
  await clock.advance(3 * MINUTE)
  expect(status.at(-1)).toBe('active 0h00 today')

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b1' })
  await clock.advance(2 * MINUTE)
  expect(status.at(-1)).toBe('active 0h02 today')
})

test('the minutes it counted are there for the next session of the day', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(14, 0) })
  const status = world(on)

  await $.session.start(START)
  await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })
  await clock.advance(4 * MINUTE)
  expect(status.at(-1)).toBe('active 0h04 today')

  await $.session.start(START)
  expect(status.at(-1)).toBe('active 0h04 today')
})

test('counts past the hour with two-digit minutes', async ($, on) => {
  const day = new Date(at(9, 0))
  const key = `minutes:${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  mock.store(on, { [key]: 59 })
  const clock = mock.clock(on, { now: at(9, 0) })
  const status = world(on)

  await $.session.start(START)
  await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })
  await clock.advance(MINUTE)
  expect(status.at(-1)).toBe('active 1h00 today')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9, 0) })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect(status.at(-1)).toBe('activo 0h00 hoy')
})
