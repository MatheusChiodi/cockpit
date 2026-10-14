import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'token-chart',
  component: 'Pane',
  requestId: 'token-chart',
  props: {
    title: 'Tokens',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const usage = (out: number) => ({
  input_tokens: 1,
  output_tokens: out,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  model: 'm',
})

test('draws a gauge per turn scaled to the largest and totals the heading', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  await $.turn.complete({ answer: 'a', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage: usage(500) })
  await $.turn.complete({ answer: 'b', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer', usage: usage(2000) })
  // A subagent's turn is not the main loop's.
  await $.turn.complete({ answer: 'c', durationMs: 1, isAborted: false, turnId: 't3', reason: 'answer', agentId: 'sub', usage: usage(9000) })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2\.5k out  2 turns/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2\.0k/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /━+●/ })).toBeDefined()
    await ui.unmount()
  }
})
