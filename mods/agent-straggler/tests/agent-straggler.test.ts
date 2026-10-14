import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

const agent = (id: string) => ({ id, description: id, type: 'Explore', status: 'running' }) as never
const spawn = (description: string) =>
  ({
    tool_use_id: 'tu',
    prompt: description,
    description,
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-sonnet-5-5',
    background: false,
    fork: false,
  }) as const

const done = { answer: 'report', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

// The world beneath the mod: spawns agents a1, a2, ... and records every toast.
const world = (on: On, toasts: string[], alive: () => string[]) => {
  let count = 0
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('agent.spawn', () => ({ model: 'sonnet', agentId: `a${++count}` }))
  on('agent.list', () => ({ value: alive().map(agent) }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('flags a subagent running far longer than the finished ones', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const alive = ['a1', 'a2']
  world(on, toasts, () => alive)
  await $.session.start(START)

  await $.agent.spawn(spawn('one'))
  await $.agent.spawn(spawn('two'))
  await clock.advance(2 * MINUTE)
  await $.turn.complete({ ...done, agentId: 'a1' })
  await $.turn.complete({ ...done, agentId: 'a2' })
  alive.splice(0, 2, 'a3')

  await $.agent.spawn(spawn('slow crawl'))
  await clock.advance(5 * MINUTE)
  expect(toasts).toEqual([])

  await clock.advance(2 * MINUTE)
  expect(toasts).toEqual(['Subagent "slow crawl" running for 6 min, others took about 2 min'])

  await clock.advance(5 * MINUTE)
  expect(toasts).toHaveLength(1)
})

test('without finished runs only a very long one is flagged, and nothing for a gone agent', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  let alive = ['a1']
  world(on, toasts, () => alive)
  await $.session.start(START)

  await $.agent.spawn(spawn('only one'))
  await clock.advance(9 * MINUTE)
  expect(toasts).toEqual([])
  alive = []
  await clock.advance(5 * MINUTE)
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, () => ['a1'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.session.start(START)

  await $.agent.spawn(spawn('lento'))
  await clock.advance(11 * MINUTE)
  expect(toasts).toEqual(['Subagente "lento" rodando há 10 min'])
})
