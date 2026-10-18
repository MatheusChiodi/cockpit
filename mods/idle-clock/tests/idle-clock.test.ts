import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000
const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

// The world beneath the mod: answers the events it listens to and records the status line.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('shows how long the session has been idle once the wait passes two minutes', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)

  await $.session.start(START)
  await $.turn.complete(TURN)

  await clock.advance(MINUTE)
  expect(status.at(-1)).toBeUndefined()

  await clock.advance(2 * MINUTE)
  expect(status.at(-1)).toBe('idle 3min')

  await clock.advance(70 * MINUTE)
  expect(status.at(-1)).toBe('idle 1h13')
})

test('clears the entry when a new turn starts', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)

  await $.session.start(START)
  await $.turn.complete(TURN)
  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBe('idle 5min')

  await $.turn.start({ text: 'go', turnId: 't-2' })
  expect(status.at(-1)).toBeUndefined()
})

test('a subagent finishing does not start the idle count', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)

  await $.session.start(START)
  await $.turn.start({ text: 'go', turnId: 't-3' })
  await $.turn.complete({ ...TURN, agentId: 'a1' })
  await clock.advance(10 * MINUTE)

  expect(status.every(text => text === undefined)).toBe(true)
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['idle-clock'], version: 1 } }))

  await $.session.start(START)
  await $.turn.complete(TURN)
  await clock.advance(5 * MINUTE)

  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.session.start(START)
  await $.turn.complete(TURN)
  await clock.advance(5 * MINUTE)

  expect(status.at(-1)).toBe('parado 5min')
})

test('shows the entry from exactly two minutes and pads the minutes past an hour', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)

  await $.session.start(START)
  await clock.advance(30000)
  await $.turn.complete(TURN)

  await clock.advance(2 * MINUTE)
  expect(status.at(-1)).toBe('idle 2min')

  await clock.advance(58 * MINUTE)
  expect(status.at(-1)).toBe('idle 1h00')

  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBe('idle 1h05')
})

test('shows nothing before the first turn ends', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)

  await $.session.start(START)
  await clock.advance(30 * MINUTE)

  expect(status.length).toBeGreaterThan(0)
  expect(status.every(text => text === undefined)).toBe(true)
})

test('counts from the last turn that ended', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)

  await $.session.start(START)
  await $.turn.complete(TURN)
  await clock.advance(10 * MINUTE)
  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.turn.complete(TURN)
  await clock.advance(3 * MINUTE)

  expect(status.at(-1)).toBe('idle 3min')
})

// Stands in for the hub: a /flip command that writes its own `off` list, as the settings pane does.
const HUB = {
  name: 'cockpit',
  register: (on: On) => {
    on('command.run', { command: 'flip' }, async ($, e) => {
      await $.state.set({ plugin: 'cockpit', key: 'off' }, e.args === 'off' ? ['idle-clock'] : [])

      return { text: 'flipped' }
    })
  },
}

test('clears the entry when the hub turns it off and shows it again on the next tick', { plugins: [HUB] }, async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)
  const flip = (args: string) => ({ command: 'flip', args, origin: { kind: 'composer' } as const, presentation: { isFullscreen: false, columns: 80 } })

  await $.session.start(START)
  await $.turn.complete(TURN)
  await clock.advance(5 * MINUTE)
  expect(status.at(-1)).toBe('idle 5min')

  await $.command.run(flip('off'))
  expect(status.at(-1)).toBeUndefined()
  await clock.advance(MINUTE)
  expect(status.at(-1)).toBeUndefined()

  await $.command.run(flip('on'))
  await clock.advance(30000)
  expect(status.at(-1)).toBe('idle 6min')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.start(START)
  await $.turn.complete(TURN)
  await clock.advance(90 * MINUTE)

  expect(status.at(-1)).toBe('inactivo 1h30')
})
