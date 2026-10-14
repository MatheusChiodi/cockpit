import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine, MockClock } from 'claude-code/testing'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

// Works for `minutes`, sending a prompt every five of them.
const work = async ($: Engine, clock: MockClock, minutes: number) => {
  for (let spent = 0; spent < minutes; spent += 5) {
    await $.prompt.submit({ text: 'go', wait: false, origin: { kind: 'composer' } })
    await clock.advance(Math.min(5, minutes - spent) * MINUTE)
  }
}

// The world beneath the mod: answers the session and the prompt, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('toasts after an hour of use, not into an empty chair', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  await work($, clock, 55)
  expect(toasts).toHaveLength(0)

  await work($, clock, 10)
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('water')

  // No prompt for hours: nothing counts.
  await clock.advance(300 * MINUTE)
  expect(toasts).toHaveLength(1)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await work($, clock, 65)

  expect(toasts[0]).toContain('copo de água')
})
