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

test('toasts every 30 minutes of use, rotating through different checks', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  await work($, clock, 25)
  expect(toasts).toHaveLength(0)

  await work($, clock, 95)
  expect(toasts).toHaveLength(4)
  expect(new Set(toasts).size).toBe(4)

  await work($, clock, 30)
  expect(toasts[4]).toBe(toasts[0])
})

test('does not count time with nobody there', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 10)
  await clock.advance(600 * MINUTE)

  expect(toasts).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await work($, clock, 35)

  expect(toasts[0]).toContain('Ombros para baixo')
})

test('starts with the shoulders check in English', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 30)
  expect(toasts).toEqual(['Shoulders down, away from your ears.'])
})

test('never toasts in a session that is not interactive', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start({ ...START, isInteractive: false })
  await work($, clock, 120)
  expect(toasts).toEqual([])
})

test('counts tool calls as use too', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.session.start(START)

  for (let spent = 0; spent < 30; spent += 5) {
    await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: `b-${spent}` })
    await clock.advance(5 * MINUTE)
  }

  expect(toasts).toHaveLength(1)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await work($, clock, 60)
  expect(toasts).toEqual(['Hombros abajo, lejos de las orejas.', 'Pies apoyados en el suelo, espalda en la silla.'])
})
