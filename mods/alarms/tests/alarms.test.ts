import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000
const DAY = 24 * 60 * MINUTE

const run = (args: string) => ({
  command: 'alarm',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number, minutes: number): number => new Date(2026, 9, 13, hours, minutes).getTime()

// The world beneath the mod: answers the session and the command, and records every toast and notification.
const world = (on: On, toasts: string[], notes: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_$, e) => {
    notes.push(e.text)

    return { value: { isSent: true, channel: 'kitty' } }
  })
}

test('rings once a day, with a toast and a notification', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: at(12, 20) })
  const toasts: string[] = []
  const notes: string[] = []
  world(on, toasts, notes)

  await $.session.start(START)
  const added = await $.command.run(run('12:30 lunch'))
  expect(added.text).toContain('Alarm 1 set for 12:30')

  await clock.advance(9 * MINUTE)
  expect(toasts).toHaveLength(0)

  await clock.advance(2 * MINUTE)
  expect(toasts).toEqual(['12:30  lunch'])
  expect(notes).toEqual(['lunch'])

  // Same day: it does not ring again.
  await clock.advance(20 * MINUTE)
  expect(toasts).toHaveLength(1)

  // Next day: it does.
  await clock.advance(DAY)
  expect(toasts).toHaveLength(2)
})

test('keeps alarms between sessions and lists and removes them', async ($, on) => {
  mock.store(on, { alarms: [{ time: '18:00', text: 'end of day', day: '' }] })
  mock.clock(on, { now: at(9, 0) })
  world(on, [], [])

  await $.session.start(START)
  await $.command.run(run('08:15 stand-up'))
  await $.command.run(run('7:5 nothing'))

  const list = await $.command.run(run('list'))
  expect(list.text).toBe('1. 08:15  stand-up\n2. 18:00  end of day')

  const removed = await $.command.run(run('rm 1'))
  expect(removed.text).toBe('Alarm 1 removed.')

  const missing = await $.command.run(run('rm 9'))
  expect(missing.text).toContain('No such alarm')

  const bad = await $.command.run(run('25:00 late'))
  expect(bad.text).toContain('Usage')
})

test('a session opened long after the time stays silent', async ($, on) => {
  mock.store(on, { alarms: [{ time: '12:30', text: 'lunch', day: '' }] })
  mock.clock(on, { now: at(15, 0) })
  const toasts: string[] = []
  world(on, toasts, [])

  await $.session.start(START)

  expect(toasts).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: at(9, 0) })
  world(on, [], [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  const added = await $.command.run(run('12:30 almoço'))

  expect(added.text).toContain('Alarme 1 definido para 12:30')
})
