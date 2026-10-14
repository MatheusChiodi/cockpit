import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'turn-history',
  component: 'Pane',
  requestId: 'turn-history',
  props: {
    title: 'Turns',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('draws one row per finished turn with duration, calls and a cross for an aborted one', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  for (const id of ['a', 'b']) {
    await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: id })
  }
  await $.turn.complete({
    answer: 'done',
    durationMs: 12400,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
    usage: { input_tokens: 10, output_tokens: 321, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' },
  })
  await $.turn.complete({ answer: '', durationMs: 900, isAborted: true, turnId: 't2', reason: 'aborted' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 turns  1 failed/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /12\.4s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2 calls/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /321 out/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /✗/ })).toBeDefined()
    await ui.unmount()
  }
})
