import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'timeline',
  component: 'Pane',
  requestId: 'timeline',
  props: {
    title: 'Timeline',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('logs prompts, tool calls, failures and turn ends in order, each with a clock time', async ($, on) => {
  mock.clock(on, { now: Date.parse('2030-03-10T14:32:05') })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command === 'ls' ? { result: { stdout: '', stderr: '', interrupted: false } } : { deny: 'blocked' },
  )

  await $.prompt.submit({ text: 'list the files', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'rm -rf /', tool_use_id: 't2' })
  await $.turn.complete({ answer: 'done', durationMs: 20100, isAborted: false, turnId: 'u1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /4 events/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /list the files/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\d\d:\d\d:\d\d/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Bash rm -rf \// })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /turn ended  20\.1s/ })).toBeDefined()
    await ui.unmount()
  }
})
