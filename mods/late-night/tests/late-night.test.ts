import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const PROMPT = { text: 'go', wait: false, origin: { kind: 'composer' } } as const

// Local time on 2026-10-13, whatever the machine's zone.
const at = (hours: number, minutes: number): number => new Date(2026, 9, 13, hours, minutes).getTime()

// The world beneath the mod: answers the session and the prompt, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('toasts once per session when used after 23:00', async ($, on) => {
  mock.clock(on, { now: at(23, 40) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  await $.prompt.submit(PROMPT)

  expect(toasts).toEqual(['It is 23:40. Park the work and pick it up tomorrow.'])

  // A new session may be told again.
  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  expect(toasts).toHaveLength(2)
})

test('the small hours count as late', async ($, on) => {
  mock.clock(on, { now: at(2, 5) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)

  expect(toasts).toEqual(['It is 02:05. Park the work and pick it up tomorrow.'])
})

test('stays quiet during the day and before 23:00', async ($, on) => {
  const clock = mock.clock(on, { now: at(14, 0) })
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.prompt.submit(PROMPT)
  await clock.set(at(22, 59))
  await $.prompt.submit(PROMPT)

  expect(toasts).toHaveLength(0)

  // Work that runs past 23:00 is caught by the next prompt.
  await clock.set(at(23, 1))
  await $.prompt.submit(PROMPT)
  expect(toasts).toHaveLength(1)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on, { now: at(23, 10) })
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await $.prompt.submit(PROMPT)

  expect(toasts[0]).toBe('São 23:10. Deixe o trabalho de lado e retome amanhã.')
})
