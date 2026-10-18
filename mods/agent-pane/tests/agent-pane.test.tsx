import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'agent-pane',
  component: 'Pane',
  requestId: 'agent-pane',
  props: {
    title: 'Crew',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('lists the subagents with type and status, refreshed when a turn ends', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('agent.list', () => ({
    value: [
      { id: 'a1', description: 'map the auth flow', type: 'Explore', status: 'running' },
      { id: 'a2', description: 'fix the failing test', type: 'general-purpose', status: 'completed' },
    ] as never,
  }))

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 subagents  1 running/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /map the auth flow/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /general-purpose/ })).toBeDefined()
    await ui.unmount()
  }
})

const LIST = [
  { id: 'a1', description: 'map the auth flow', type: 'Explore', status: 'running' },
  { id: 'a2', name: 'reviewer', description: 'review   the\n diff', type: 'general-purpose', status: 'failed' },
  { id: 'a3', description: 'old task', type: 'Plan', status: 'completed' },
]

const cmd = { command: 'crew', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

test('shows the empty hint before any subagent is listed', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /No subagent yet/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /0 subagents  0 running/ })).toBeDefined()
    await ui.unmount()
  }
})

test('/crew refreshes the list, opens the pane and answers', async ($, on) => {
  const opened: unknown[] = []
  on('agent.list', () => ({ value: LIST as never }))
  on('ui.open', (_$, e) => {
    opened.push(e)

    return { value: { isPlaced: true } }
  })

  expect((await $.command.run(cmd)).text).toBe('Crew pane opened.')
  expect(opened).toEqual([expect.objectContaining({ id: 'agent-pane', title: 'Crew' })])

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /3 subagents  1 running/ })).toBeDefined()
  // The name wins over the description, and whitespace collapses.
  expect(await ui.find({ type: 'Text', text: /reviewer/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /review {3}the/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /✗/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /✓/ })).toBeDefined()
  await ui.unmount()
})

test('an agent list that fails leaves the pane empty', async ($, on) => {
  on('agent.list', () => {
    throw new Error('no agents')
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No subagent yet/ })).toBeDefined()
  await ui.unmount()
})

test('draws statuses and summary in Portuguese when the hub is set to pt', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('agent.list', () => ({ value: LIST as never }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  expect((await $.command.run(cmd)).text).toBe('Painel da equipe aberto.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /3 subagentes  1 rodando/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /falhou/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /concluído/ })).toBeDefined()
  await ui.unmount()
})

test('draws the empty hint in Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Aún no hay subagentes/ })).toBeDefined()
  await ui.unmount()
})
