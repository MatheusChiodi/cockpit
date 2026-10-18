import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const MINUTE = 60000
const NOW = Date.UTC(2026, 9, 13, 12, 0)

const measure = (rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]) => ({
  context: { window: 200000 },
  rateLimits,
  changed: ['rateLimits' as const],
})

const inMinutes = (minutes: number): string => new Date(NOW + minutes * MINUTE).toISOString()

// The world beneath the mod: answers the measurement and records the status line.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('shows the tightest window and when it resets', async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)

  await $.session.measure(
    measure([
      { kind: 'seven_day', percentUsed: 20, resetsAt: inMinutes(3 * 1440 + 120) },
      { kind: 'five_hour', percentUsed: 42.4, resetsAt: inMinutes(90) },
    ]),
  )
  expect(status.at(-1)).toBe('limit 5h 42% · resets 1h30')

  await $.session.measure(measure([{ kind: 'seven_day', percentUsed: 80, resetsAt: inMinutes(3 * 1440 + 120) }]))
  expect(status.at(-1)).toBe('limit 7d 80% · resets 3d 2h')

  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 90, resetsAt: inMinutes(25) }]))
  expect(status.at(-1)).toBe('limit 5h 90% · resets 25min')
})

test('shows nothing without rate limits, and clears once the window has reset', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const status = world(on)

  await $.session.start({ cwd: '/project', surface: 'terminal', isInteractive: true })
  await $.session.measure(measure([]))
  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 10 }]))
  expect(status).toEqual([])

  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 10, resetsAt: inMinutes(2) }]))
  expect(status.at(-1)).toBe('limit 5h 10% · resets 2min')

  await clock.advance(3 * MINUTE)
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['reset-countdown'], version: 1 } }))

  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 50, resetsAt: inMinutes(60) }]))
  expect(status).toEqual([undefined])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.measure(measure([{ kind: 'spend_limit', percentUsed: 50, resetsAt: inMinutes(60) }]))
  expect(status.at(-1)).toBe('limite gasto 50% · reseta 1h00')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.measure(measure([{ kind: 'spend_limit', percentUsed: 33.6, resetsAt: inMinutes(45) }]))
  expect(status.at(-1)).toBe('límite gasto 34% · se reinicia en 45min')
})

test('counts down every minute once the session started', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const status = world(on)

  await $.session.start({ cwd: '/project', surface: 'terminal', isInteractive: true })
  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 70, resetsAt: inMinutes(61) }]))
  expect(status.at(-1)).toBe('limit 5h 70% · resets 1h01')

  await clock.advance(MINUTE)
  expect(status.at(-1)).toBe('limit 5h 70% · resets 1h00')

  await clock.advance(MINUTE)
  expect(status.at(-1)).toBe('limit 5h 70% · resets 59min')
})

test('formats a whole day and an unknown window kind', async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)

  await $.session.measure(measure([{ kind: 'seven_day', percentUsed: 5, resetsAt: inMinutes(1440) }]))
  expect(status.at(-1)).toBe('limit 7d 5% · resets 1d 0h')

  await $.session.measure(measure([{ kind: 'opus_weekly', percentUsed: 12, resetsAt: inMinutes(30) }]))
  expect(status.at(-1)).toBe('limit opus_weekly 12% · resets 30min')
})

test('a window without a reset time never wins, even when tighter', async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)

  await $.session.measure(
    measure([
      { kind: 'five_hour', percentUsed: 99 },
      { kind: 'seven_day', percentUsed: 30, resetsAt: inMinutes(120) },
    ]),
  )
  expect(status.at(-1)).toBe('limit 7d 30% · resets 2h00')
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: On) => {
    on('command.run', { command: 'flip' }, async ($, e) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['reset-countdown'] : [])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off', { plugins: [HUB] }, async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)

  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 50, resetsAt: inMinutes(60) }]))
  expect(status.at(-1)).toBe('limit 5h 50% · resets 1h00')

  await $.command.run({ command: 'flip', args: 'off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.at(-1)).toBeUndefined()
})

test('ignores a window whose reset time cannot be read', async ($, on) => {
  mock.clock(on, { now: NOW })
  const status = world(on)

  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 90, resetsAt: 'soon' }]))
  expect(status).toEqual([])

  await $.session.measure(
    measure([
      { kind: 'five_hour', percentUsed: 90, resetsAt: 'soon' },
      { kind: 'seven_day', percentUsed: 40, resetsAt: inMinutes(30) },
    ]),
  )
  expect(status.at(-1)).toBe('limit 7d 40% · resets 30min')
})
