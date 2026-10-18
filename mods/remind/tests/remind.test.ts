import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

const run = (args: string) => ({
  command: 'remind',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// The world beneath the mod: answers the session and the command, and records every toast and notification.
const world = (on: On, toasts: string[], notes: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', (_$, e) => {
    notes.push(`${e.title}: ${e.text}`)

    return { value: { isSent: true, channel: 'kitty' } }
  })
}

test('fires a toast and a notification once, after the minutes', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const toasts: string[] = []
  const notes: string[] = []
  world(on, toasts, notes)

  await $.session.start(START)
  const set = await $.command.run(run('15 check the deploy'))
  expect(set.text).toBe('I will remind you in 15 min: check the deploy')

  await clock.advance(14 * MINUTE)
  expect(toasts).toHaveLength(0)

  await clock.advance(MINUTE)
  expect(toasts).toEqual(['check the deploy'])
  expect(notes).toEqual(['Reminder: check the deploy'])

  await clock.advance(60 * MINUTE)
  expect(toasts).toHaveLength(1)
})

test('refuses a bad amount or a missing text', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  world(on, [], [])

  await $.session.start(START)

  for (const args of ['', '15', 'soon text', '0 now', '5000 never']) {
    const answer = await $.command.run(run(args))
    expect(answer.text, args).toContain('Usage')
  }
})

test('a reminder kept from a closed session fires in the next one', async ($, on) => {
  mock.store(on, { remind: [{ at: 2 * MINUTE, text: 'call back' }] })
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, [])

  await $.session.start(START)
  await clock.advance(3 * MINUTE)

  expect(toasts).toEqual(['call back'])
})

test('speaks the language set in the hub', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  world(on, [], [])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  const set = await $.command.run(run('10 ligar'))

  expect(set.text).toBe('Aviso em 10 min: ligar')
})

test('refuses a new reminder once twenty are pending', async ($, on) => {
  mock.store(on, { remind: Array.from({ length: 20 }, (_, at) => ({ at: (at + 60) * MINUTE, text: `r${at}` })) })
  mock.clock(on)
  world(on, [], [])

  await $.session.start(START)
  const answer = await $.command.run(run('5 one more'))

  expect(answer.text).toBe('Limit of 20 pending reminders reached.')
})

test('accepts the bounds of one minute and a whole day', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, [])

  await $.session.start(START)
  expect((await $.command.run(run('1 stretch'))).text).toBe('I will remind you in 1 min: stretch')
  expect((await $.command.run(run('1440 tomorrow'))).text).toBe('I will remind you in 1440 min: tomorrow')
  expect((await $.command.run(run('1441 too far'))).text).toBe('Usage: /remind <minutes, 1 to 1440> <text>')

  await clock.advance(MINUTE)
  expect(toasts).toEqual(['stretch'])
})

test('a fired reminder leaves the store, so the next session does not fire it again', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, [])

  await $.session.start(START)
  await $.command.run(run('2 tea'))
  await clock.advance(3 * MINUTE)
  expect(toasts).toEqual(['tea'])

  await $.session.start(START)
  await clock.advance(10 * MINUTE)
  expect(toasts).toEqual(['tea'])
})

test('a session that is not interactive does not arm kept reminders', async ($, on) => {
  mock.store(on, { remind: [{ at: MINUTE, text: 'call back' }] })
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, [])

  await $.session.start({ ...START, isInteractive: false })
  await clock.advance(5 * MINUTE)

  expect(toasts).toEqual([])
})

test('keeps a multi-line text and survives a failing notification channel', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.notify', () => {
    throw new Error('no channel')
  })

  await $.session.start(START)
  await $.command.run(run('3 first line\nsecond line'))
  await clock.advance(3 * MINUTE)

  expect(toasts).toEqual(['first line\nsecond line'])
})

test('speaks Spanish in the answer and the notification title', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const notes: string[] = []
  world(on, [], notes)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect((await $.command.run(run('4 llamar'))).text).toBe('Te aviso en 4 min: llamar')
  expect((await $.command.run(run('cero nada'))).text).toBe('Uso: /remind <minutos, de 1 a 1440> <texto>')

  await clock.advance(4 * MINUTE)
  expect(notes).toEqual(['Recordatorio: llamar'])
})
