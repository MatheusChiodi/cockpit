import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: '/project', surface: 'terminal', isInteractive: true } as const
const MINUTE = 60000

const BAND = {
  plugin: 'terminal-pet',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const DONE = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const
const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

// The world beneath the mod: the turn, a Bash tool that works or fails, and the empty box the engine would draw.
const world = (on: On, tool: { fails: boolean }) => {
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Bash' }, () => (tool.fails ? { ...ANSWER, isError: true } : ANSWER))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const mood = async (
  $: Engine,
  surface: 'terminal' | 'desktop' = 'terminal',
): Promise<string> => {
  const ui = await $.ui.mount({ ...BAND, surface })
  const texts = await ui.findAll({ type: 'Text' })
  await ui.unmount()

  return texts.map(found => found.text).join(' ')
}

test('starts ready, works during a turn and celebrates a clean answer', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })

  expect(await mood($)).toContain('ready whenever you are')
  expect(await mood($, 'desktop')).toContain('PET')

  await $.turn.start({ text: 'go', turnId: 't-1' })
  expect(await mood($)).toContain('working…')

  await $.turn.complete(DONE)
  expect(await mood($)).toContain('it worked!')
})

test('is sad when a tool failed during the turn, and recovers on the next clean one', async ($, on) => {
  mock.clock(on)
  const tool = { fails: true }
  world(on, tool)

  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.tool.call({ tool: 'Bash', command: 'false', tool_use_id: 'b1' })
  await $.turn.complete(DONE)
  expect(await mood($)).toContain('something failed')

  tool.fails = false
  await $.turn.start({ text: 'again', turnId: 't-3' })
  await $.tool.call({ tool: 'Bash', command: 'true', tool_use_id: 'b2' })
  await $.turn.complete(DONE)
  expect(await mood($)).toContain('it worked!')
})

test('is sad when the turn was interrupted, and ignores a subagent finishing', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })

  await $.turn.start({ text: 'go', turnId: 't-4' })
  await $.turn.complete({ ...DONE, agentId: 'a1', reason: 'error' })
  expect(await mood($)).toContain('working…')

  await $.turn.complete({ ...DONE, reason: 'aborted', isAborted: true })
  expect(await mood($)).toContain('something failed')
})

test('falls asleep after five idle minutes', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  world(on, { fails: false })

  await $.session.start(START)
  await $.turn.start({ text: 'go', turnId: 't-5' })
  await $.turn.complete(DONE)

  await clock.advance(2 * MINUTE)
  expect(await mood($)).toContain('it worked!')

  await clock.advance(4 * MINUTE)
  expect(await mood($)).toContain('nobody has talked to me in a while')
})

test('hides while the hub lists it as off', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['terminal-pet'], version: 1 } }))

  expect(await mood($)).not.toContain('PET')
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect(await mood($)).toContain('pronto quando você estiver')
})

test('a denied call does not make it sad', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })
  on('tool.call', { tool: 'Read' }, () => ({ deny: 'nope' }))

  await $.turn.start({ text: 'go', turnId: 't-6' })
  await $.tool.call({ tool: 'Read', file_path: '/a', tool_use_id: 'r1' })
  await $.turn.complete(DONE)
  expect(await mood($)).toContain('it worked!')
})

test('a subagent failing does not make it sad', async ($, on) => {
  mock.clock(on)
  world(on, { fails: true })

  await $.turn.start({ text: 'go', turnId: 't-7' })
  await $.tool.call({ tool: 'Bash', command: 'false', tool_use_id: 'b3', ...{ agentId: 'sub' } })
  await $.turn.complete(DONE)
  expect(await mood($)).toContain('it worked!')
})

test('does not fall asleep before the first turn ends', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  world(on, { fails: false })

  await $.session.start(START)
  await clock.advance(10 * MINUTE)
  expect(await mood($)).toContain('ready whenever you are')
})

test('wakes up working when a new turn starts after sleeping', async ($, on) => {
  const clock = mock.clock(on, { now: 1000 * MINUTE })
  world(on, { fails: false })

  await $.session.start(START)
  await $.turn.start({ text: 'go', turnId: 't-8' })
  await $.turn.complete(DONE)
  await clock.advance(6 * MINUTE)
  expect(await mood($)).toContain('nobody has talked')

  await $.turn.start({ text: 'again', turnId: 't-9' })
  await clock.advance(10 * MINUTE)
  expect(await mood($)).toContain('working…')
})

test('hides while a survey is open', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /PET/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect(await mood($)).toContain('listo cuando quieras')
  await $.turn.start({ text: 'go', turnId: 't-10' })
  await $.turn.complete(DONE)
  expect(await mood($)).toContain('¡funcionó!')
})

test('speaks Portuguese for a failed turn', async ($, on) => {
  mock.clock(on)
  world(on, { fails: false })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.start({ text: 'go', turnId: 't-11' })
  await $.turn.complete({ ...DONE, reason: 'error' })
  expect(await mood($)).toContain('algo falhou, vamos de novo')
})
