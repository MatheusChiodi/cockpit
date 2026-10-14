import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'diff-pane',
  component: 'Pane',
  requestId: 'diff-pane',
  props: {
    title: 'Edits',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('lists edits and writes with lines added and removed, and a running total', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: {} as never }))
  on('tool.call', { tool: 'Write' }, () => ({ result: {} as never }))

  await $.tool.call({
    tool: 'Edit',
    tool_use_id: 'e1',
    file_path: 'src/app.ts',
    old_string: 'a\nb',
    new_string: 'a\nb\nc\nd\ne',
  })
  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: 'src/new.ts', content: '1\n2\n3\n4' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 edits  \+9 −2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /src\/new\.ts/ })).toBeDefined()
    await ui.unmount()
  }
})
