import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const SECOND = 1000

const run = {
  command: 'breathe',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

// The world beneath the mod: answers the session and the command, and records every toast.
const world = (on: On, toasts: string[]) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('guides five rounds: in 4, hold 4, out 6', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  const started = await $.command.run(run)
  expect(started.text).toBe('Breathing, 5 rounds. Settle in.')
  expect(toasts).toEqual(['Breathe in… 4  (1/5)'])

  await clock.advance(3999)
  expect(toasts).toHaveLength(1)

  await clock.advance(1)
  expect(toasts[1]).toBe('Hold… 4  (1/5)')

  await clock.advance(4 * SECOND)
  expect(toasts[2]).toBe('Breathe out… 6  (1/5)')

  await clock.advance(6 * SECOND)
  expect(toasts[3]).toBe('Breathe in… 4  (2/5)')

  await clock.advance(70 * SECOND)
  // Fifteen phases, then the closing line, and nothing after it.
  expect(toasts).toHaveLength(16)
  expect(toasts.at(-1)).toBe('Done. Back to it, slowly.')

  await clock.advance(60 * SECOND)
  expect(toasts).toHaveLength(16)
})

test('running it again starts over instead of doubling the toasts', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.session.start(START)
  await $.command.run(run)
  await clock.advance(5 * SECOND)
  await $.command.run(run)

  expect(toasts.at(-1)).toBe('Breathe in… 4  (1/5)')

  await clock.advance(4 * SECOND)
  expect(toasts.at(-1)).toBe('Hold… 4  (1/5)')
  expect(toasts).toHaveLength(4)
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await $.command.run(run)

  expect(toasts[0]).toBe('Inspire… 4  (1/5)')
})

test('each toast lasts as long as its phase', async ($, on) => {
  const clock = mock.clock(on)
  const timeouts: (number | undefined)[] = []
  on('ui.toast', (_$, e) => {
    timeouts.push(e.timeoutMs)

    return { value: undefined }
  })

  await $.command.run(run)
  await clock.advance(4 * SECOND)
  await clock.advance(4 * SECOND)
  expect(timeouts).toEqual([4000, 4000, 6000])

  await clock.advance(80 * SECOND)
  expect(timeouts.at(-1)).toBe(6000)
})

test('registers /breathe with its description', async ($, on) => {
  const described: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    described.push(`${e.name}: ${e.description}`)

    return { value: { command: e.name } }
  })

  await $.session.start(START)
  expect(described).toEqual(['breathe: One minute of guided breathing through toasts: in 4, hold 4, out 6, five rounds'])
})

test('the last round is numbered 5/5', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)

  await $.command.run(run)
  await clock.advance(4 * 14 * SECOND)
  expect(toasts.at(-1)).toBe('Breathe in… 4  (5/5)')
})

test('speaks Spanish from the hub, through to the end', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Respirando, 5 rondas. Ponte cómodo.')
  await clock.advance(4 * SECOND)
  await clock.advance(4 * SECOND)
  expect(toasts.slice(0, 3)).toEqual(['Inhala… 4  (1/5)', 'Sostén… 4  (1/5)', 'Exhala… 6  (1/5)'])

  await clock.advance(80 * SECOND)
  expect(toasts.at(-1)).toBe('Listo. Vuelve con calma.')
})

test('the Portuguese closing line', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.command.run(run)
  await clock.advance(80 * SECOND)
  expect(toasts.at(-1)).toBe('Pronto. Volte com calma.')
})
