import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'agents-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The hub's switch and language, plus the empty box the engine would draw with no mod.
const hub = (on: any, off: string[] = [], lang = 'en') => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

const draw = async ($: any, surface: 'terminal' | 'desktop' = 'terminal') => {
  await $.session.start(START)

  return $.ui.mount({ ...BAND, surface })
}

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

const agent = (id: string, status: string, description = id, name?: string) =>
  ({ id, description, type: 'Explore', status, ...(name === undefined ? {} : { name }) }) as never

const world = (on: any, listing: () => unknown[], off: string[] = [], lang = 'en') => {
  hub(on, off, lang)
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))
  on('agent.list', () => ({ value: listing() as never }))
}

test('counts the subagents at work and names them', async ($, on) => {
  world(on, () => [
    agent('a1', 'running', 'map the auth flow'),
    agent('a2', 'completed', 'fix the test'),
    agent('a3', 'pending', 'ignored description', 'reviewer'),
    agent('a4', 'waiting', 'wait for me'),
  ])
  await $.turn.complete(TURN)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /AGENTS/)).toBe(true)
    expect(await has(ui, /3 running/)).toBe(true)
    expect(await has(ui, /map the auth flow {2}reviewer {2}wait for me/)).toBe(true)
    expect(await has(ui, /fix the test/)).toBe(false)
    await ui.unmount()
  }
})

test('shows five names and the rest as a count', async ($, on) => {
  world(on, () => Array.from({ length: 7 }, (_, i) => agent(`a${i}`, 'running', `job${i}`)))
  await $.turn.complete(TURN)

  const ui = await draw($)
  expect(await has(ui, /7 running/)).toBe(true)
  expect(await has(ui, /\+2/)).toBe(true)
})

test('follows the subagents on a short pulse', async ($, on) => {
  const clock = mock.clock(on)
  let listed = [agent('a1', 'running')]
  world(on, () => listed)
  await $.session.start(START)

  await clock.advance(5000)
  expect(await has(await draw($), /1 running/)).toBe(true)

  listed = []
  await clock.advance(5000)
  expect(await has(await draw($), /AGENTS/)).toBe(false)
})

test('draws nothing when no subagent is working', async ($, on) => {
  world(on, () => [agent('a1', 'completed')])
  await $.turn.complete(TURN)
  expect(await has(await draw($), /AGENTS/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, () => [agent('a1', 'running')], ['agents-band'])
  await $.turn.complete(TURN)
  expect(await has(await draw($), /AGENTS/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, () => [agent('a1', 'running')], [], 'pt')
  await $.turn.complete(TURN)

  const ui = await draw($)
  expect(await has(ui, /AGENTES/)).toBe(true)
  expect(await has(ui, /1 rodando/)).toBe(true)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on, () => [agent('a1', 'running')], [], 'es')
  await $.turn.complete(TURN)

  const ui = await draw($)
  expect(await has(ui, /AGENTES/)).toBe(true)
  expect(await has(ui, /1 en ejecución/)).toBe(true)
})

test('cuts a long label at 28 characters and falls back to the agent type', async ($, on) => {
  world(on, () => [
    agent('a1', 'running', `${'x'.repeat(28)}CUT`),
    { id: 'a2', type: 'Plan', status: 'running' } as never,
  ])
  await $.turn.complete(TURN)

  const ui = await draw($)
  expect(await has(ui, /x{28} {2}Plan/)).toBe(true)
  expect(await has(ui, /CUT/)).toBe(false)
})

test('draws nothing when the agent list cannot be read', async ($, on) => {
  hub(on)
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))
  on('agent.list', () => ({ deny: 'unavailable' }))
  await $.turn.complete(TURN)

  expect(await has(await draw($), /AGENTS/)).toBe(false)
})

test('hides while a survey is shown', async ($, on) => {
  world(on, () => [agent('a1', 'running')])
  await $.turn.complete(TURN)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await has(ui, /AGENTS/)).toBe(false)
})

test('keeps the bands drawn beneath it', async ($, on) => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: [], version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)

    return <Text>other band</Text>
  })
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))
  on('agent.list', () => ({ value: [agent('a1', 'running')] }))
  await $.turn.complete(TURN)

  const ui = await draw($)
  expect(await has(ui, /other band/)).toBe(true)
  expect(await has(ui, /1 running/)).toBe(true)
})

test('a turn that ends picks up an agent that finished in the meantime', async ($, on) => {
  let listed = [agent('a1', 'running'), agent('a2', 'running')]
  world(on, () => listed)
  await $.turn.complete(TURN)
  expect(await has(await draw($), /2 running/)).toBe(true)

  listed = [agent('a1', 'running'), agent('a2', 'failed')]
  await $.turn.complete(TURN)
  expect(await has(await draw($), /1 running/)).toBe(true)
})
