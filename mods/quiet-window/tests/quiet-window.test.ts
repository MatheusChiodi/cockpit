import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number, minutes: number): number => new Date(2026, 9, 13, hours, minutes).getTime()

const quiet = (args: string) => ({
  command: 'quiet',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// The world beneath the mod: whatever reaches the bottom was shown, and is recorded.
const world = (on: On, shown: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    shown.push(`toast: ${e.text}`)

    return { value: undefined }
  })
  on('ui.notify', (_$, e) => {
    shown.push(`notify: ${e.text}`)

    return { value: { isSent: true as const, channel: 'kitty' as const } }
  })
}

// `/quiet test` sends one toast and one notification through the mod's own hooks: two notices.
test('holds toasts and notifications for the window, then says once how many', async ($, on) => {
  const clock = mock.clock(on, { now: at(14, 0) })
  const shown: string[] = []
  world(on, shown)

  await $.session.start(START)
  expect((await $.command.run(quiet('45'))).text).toBe('Quiet for 45 min, until 14:45. Toasts and notifications are held.')

  expect((await $.command.run(quiet('test'))).text).toBe('The test toast and notification were held. The window works.')
  await clock.advance(10 * MINUTE)
  await $.command.run(quiet('test'))
  expect(shown).toEqual([])
  expect((await $.command.run(quiet(''))).text).toBe('Quiet until 14:45. 4 held so far.')

  await clock.advance(36 * MINUTE)
  expect(shown).toEqual(['toast: Quiet window over. 4 notices were held.'])

  // After the window everything flows again, and nothing is said twice.
  expect((await $.command.run(quiet('test'))).text).toBe('Not quiet: the test toast and notification were shown.')
  await clock.advance(90 * MINUTE)
  expect(shown).toEqual(['toast: Quiet window over. 4 notices were held.', 'toast: quiet test', 'notify: quiet test'])
})

test('stays silent at the end of a window that held nothing, and says so when asked', async ($, on) => {
  const clock = mock.clock(on, { now: at(9, 0) })
  const shown: string[] = []
  world(on, shown)

  await $.session.start(START)
  expect((await $.command.run(quiet(''))).text).toContain('Not quiet')

  await $.command.run(quiet('20'))
  await clock.advance(25 * MINUTE)
  expect(shown).toEqual([])
})

test('off ends the window at once and reports what was held', async ($, on) => {
  const clock = mock.clock(on, { now: at(9, 0) })
  const shown: string[] = []
  world(on, shown)

  await $.session.start(START)
  await $.command.run(quiet('60'))
  await $.command.run(quiet('test'))
  expect((await $.command.run(quiet('off'))).text).toBe('Quiet window ended. 2 notices were held.')

  // The old timer must not speak for a window that is gone.
  await clock.advance(70 * MINUTE)
  expect(shown).toEqual([])
})

test('a new window replaces the old timer, and bad minutes are refused', async ($, on) => {
  const clock = mock.clock(on, { now: at(9, 0) })
  const shown: string[] = []
  world(on, shown)

  await $.session.start(START)
  expect((await $.command.run(quiet('0'))).text).toBe('Give the minutes, from 1 to 480: /quiet 45')
  expect((await $.command.run(quiet('soon'))).text).toBe('Give the minutes, from 1 to 480: /quiet 45')
  expect((await $.command.run(quiet('999'))).text).toBe('Give the minutes, from 1 to 480: /quiet 45')

  await $.command.run(quiet('10'))
  await $.command.run(quiet('test'))
  await $.command.run(quiet('30'))
  await $.command.run(quiet('test'))

  // The first timer (10 min) must not close the second window, which started over with its own count.
  await clock.advance(15 * MINUTE)
  await $.command.run(quiet('test'))
  expect(shown).toEqual([])

  await clock.advance(20 * MINUTE)
  expect(shown).toEqual(['toast: Quiet window over. 4 notices were held.'])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on, { now: at(9, 0) })
  const shown: string[] = []
  world(on, shown)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  expect((await $.command.run(quiet('30'))).text).toBe('Silêncio por 30 min, até 09:30. Toasts e notificações ficam retidos.')
  await $.command.run(quiet('test'))
  await clock.advance(31 * MINUTE)

  expect(shown).toEqual(['toast: Janela de silêncio terminou. 2 avisos foram retidos.'])
})

test('accepts the bounds of 1 and 480 minutes, in any case for the words', async ($, on) => {
  mock.clock(on, { now: at(9, 0) })
  world(on, [])

  await $.session.start(START)
  expect((await $.command.run(quiet('1'))).text).toBe('Quiet for 1 min, until 09:01. Toasts and notifications are held.')
  expect((await $.command.run(quiet('480'))).text).toBe('Quiet for 480 min, until 17:00. Toasts and notifications are held.')
  expect((await $.command.run(quiet('481'))).text).toBe('Give the minutes, from 1 to 480: /quiet 45')
  expect((await $.command.run(quiet('-5'))).text).toBe('Give the minutes, from 1 to 480: /quiet 45')
  expect((await $.command.run(quiet('  OFF '))).text).toBe('Quiet window ended. 0 notices were held.')
})

test('once the window is over, /quiet says it is not quiet', async ($, on) => {
  const clock = mock.clock(on, { now: at(9, 0) })
  world(on, [])

  await $.session.start(START)
  await $.command.run(quiet('5'))
  expect((await $.command.run(quiet(''))).text).toBe('Quiet until 09:05. 0 held so far.')

  await clock.advance(5 * MINUTE)
  expect((await $.command.run(quiet(''))).text).toBe('Not quiet. /quiet <minutes> holds toasts and notifications.')
})

test('a new session ends the window without a summary from the old timer', async ($, on) => {
  const clock = mock.clock(on, { now: at(9, 0) })
  const shown: string[] = []
  world(on, shown)

  await $.session.start(START)
  await $.command.run(quiet('10'))
  await $.command.run(quiet('test'))
  await $.session.start(START)
  expect((await $.command.run(quiet(''))).text).toBe('Not quiet. /quiet <minutes> holds toasts and notifications.')

  await clock.advance(15 * MINUTE)
  expect(shown).toEqual([])
})

test('registers /quiet at session start', async ($, on) => {
  mock.clock(on)
  const names: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    names.push(e.name)

    return { value: { command: e.name } }
  })

  await $.session.start(START)
  expect(names).toEqual(['quiet'])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  const clock = mock.clock(on, { now: at(9, 0) })
  const shown: string[] = []
  world(on, shown)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  expect((await $.command.run(quiet('test'))).text).toBe('Sin silencio: se mostraron el toast y la notificación de prueba.')
  expect((await $.command.run(quiet('15'))).text).toBe('Silencio por 15 min, hasta 09:15. Los toasts y notificaciones quedan retenidos.')
  expect((await $.command.run(quiet('test'))).text).toBe('El toast y la notificación de prueba quedaron retenidos. La ventana funciona.')
  expect((await $.command.run(quiet('off'))).text).toBe('Ventana de silencio terminada. Se retuvieron 2 avisos.')

  await clock.advance(20 * MINUTE)
  expect(shown).toEqual(['toast: prueba de silencio', 'notify: prueba de silencio'])
})
