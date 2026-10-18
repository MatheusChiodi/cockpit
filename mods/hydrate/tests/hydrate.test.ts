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

test('a non-interactive session never toasts', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start({ ...START, isInteractive: false })
  await work($, clock, 130)

  expect(toasts).toHaveLength(0)
})

test('tool calls count as use too', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.session.start(START)

  for (let spent = 0; spent < 65; spent += 5) {
    await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: `b${spent}` })
    await clock.advance(5 * MINUTE)
  }

  expect(toasts).toHaveLength(1)
})

test('an idle stretch pauses the hour without starting it over', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 40)
  await clock.advance(120 * MINUTE)
  expect(toasts).toHaveLength(0)

  await work($, clock, 15)
  expect(toasts).toHaveLength(1)
})

test('toasts again after another hour', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 125)

  expect(toasts).toHaveLength(2)
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await work($, clock, 65)

  expect(toasts).toEqual(['¿Un vaso de agua ahora? Llevas una hora en esto.'])
})
