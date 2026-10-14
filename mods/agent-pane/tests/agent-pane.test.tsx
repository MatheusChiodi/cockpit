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
