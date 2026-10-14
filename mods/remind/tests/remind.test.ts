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
