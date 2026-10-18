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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, () => ['a1'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.session.start(START)

  await $.agent.spawn(spawn('lento'))
  await clock.advance(11 * MINUTE)
  expect(toasts).toEqual(['Subagente "lento" lleva 10 min en marcha'])
})

test('a teammate is never tracked', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, () => ['a1'])
  await $.session.start(START)

  await $.agent.spawn({ ...spawn('teammate'), isTeammate: true } as never)
  await clock.advance(15 * MINUTE)
  expect(toasts).toEqual([])
})

test('an aborted run does not count as a finished one', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const alive = ['a1', 'a2', 'a3']
  world(on, toasts, () => alive)
  await $.session.start(START)

  await $.agent.spawn(spawn('one'))
  await $.agent.spawn(spawn('two'))
  await clock.advance(MINUTE)
  await $.turn.complete({ ...done, agentId: 'a1', isAborted: true })
  await $.turn.complete({ ...done, agentId: 'a2', isAborted: true })
  await $.agent.spawn(spawn('third'))

  // With no finished runs, the limit stays at ten minutes for the third agent.
  await clock.advance(5 * MINUTE)
  expect(toasts.filter(text => text.includes('third'))).toEqual([])
})

test('never flags before two minutes, however quick the others were', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const alive = ['a3']
  world(on, toasts, () => alive)
  await $.session.start(START)

  await $.agent.spawn(spawn('one'))
  await $.agent.spawn(spawn('two'))
  await clock.advance(10000)
  await $.turn.complete({ ...done, agentId: 'a1' })
  await $.turn.complete({ ...done, agentId: 'a2' })

  await $.agent.spawn(spawn('third'))
  await clock.advance(90000)
  expect(toasts).toEqual([])

  await clock.advance(MINUTE)
  expect(toasts).toEqual(['Subagent "third" running for 2 min, others took about 1 min'])
})

test('cuts the description at 40 characters', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  world(on, toasts, () => ['a1'])
  await $.session.start(START)

  await $.agent.spawn(spawn(`${'d'.repeat(40)}TAIL`))
  await clock.advance(11 * MINUTE)
  expect(toasts[0]).toContain(`"${'d'.repeat(40)}"`)
})

test('keeps following a run while the agent list cannot be read', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  let isReadable = true
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('agent.spawn', () => ({ model: 'sonnet', agentId: 'a1' }))
  on('agent.list', () => (isReadable ? { value: [agent('a1')] } : { deny: 'unavailable' }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  await $.session.start(START)

  await $.agent.spawn(spawn('steady'))
  isReadable = false
  await clock.advance(5 * MINUTE)
  isReadable = true
  await clock.advance(6 * MINUTE)
  expect(toasts).toEqual(['Subagent "steady" running for 10 min'])
})
