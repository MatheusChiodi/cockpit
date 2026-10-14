import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: answers the events it listens to and records the status line.
const world = (on: On) => {
  const status: (string | undefined)[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const call = ($: Engine, id: string, agentId?: string) =>
  $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: id, ...(agentId === undefined ? {} : { agentId }) })

test('counts the time and the tools of the running turn, and clears at the end', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await clock.advance(5000)
  expect(status.at(-1)).toBe('turn 5s · 0 tools')

  await call($, 'b1')
  await clock.advance(1000)
  expect(status.at(-1)).toBe('turn 6s · 1 tool')

  await call($, 'b2')
  await clock.advance(60000)
  expect(status.at(-1)).toBe('turn 1m06s · 2 tools')

  await $.turn.complete(TURN)
  expect(status.at(-1)).toBeUndefined()
})

test('a subagent neither counts nor ends the turn', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)

  await $.turn.start({ text: 'go', turnId: 't-2' })
  await call($, 'b3', 'a1')
  await $.turn.complete({ ...TURN, agentId: 'a1' })
  await clock.advance(2000)

  expect(status.at(-1)).toBe('turn 2s · 0 tools')
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['turn-progress'], version: 1 } }))

  await $.turn.start({ text: 'go', turnId: 't-3' })
  await clock.advance(3000)

  expect(status.every(text => text === undefined)).toBe(true)
  await $.turn.complete(TURN)
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.turn.start({ text: 'go', turnId: 't-4' })
  await call($, 'b4')
  await call($, 'b5')
  await clock.advance(1000)

  expect(status.at(-1)).toBe('turno 1s · 2 herramientas')
  await $.turn.complete(TURN)
})
