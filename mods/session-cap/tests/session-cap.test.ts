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

test('toasts at three hours of continuous use, then every hour', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  await work($, clock, 175)
  expect(toasts).toHaveLength(0)

  await work($, clock, 10)
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('3 hours')

  await work($, clock, 60)
  expect(toasts).toHaveLength(2)
  expect(toasts[1]).toContain('4 hours')
})

test('a long pause ends the run', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)

  await work($, clock, 150)
  await clock.advance(45 * MINUTE)
  await work($, clock, 150)

  expect(toasts).toHaveLength(0)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await work($, clock, 185)

  expect(toasts[0]).toContain('3 horas seguidas')
})

test('stays silent in a non-interactive session', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start({ ...START, isInteractive: false })
  await work($, clock, 200)

  expect(toasts).toHaveLength(0)
})

test('tool calls count as use, too', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.session.start(START)

  for (let spent = 0; spent < 185; spent += 10) {
    await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: `b-${spent}` })
    await clock.advance(10 * MINUTE)
  }

  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toBe('3 hours straight in this session. Time to stop and rest.')
})

test('stops toasting once the person goes idle', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await work($, clock, 185)
  expect(toasts).toHaveLength(1)

  await clock.advance(120 * MINUTE)
  expect(toasts).toHaveLength(1)
})

test('speaks Portuguese when the hub language is pt', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await work($, clock, 185)

  expect(toasts[0]).toBe('3 horas seguidas nesta sessão. Hora de parar e descansar.')
})
