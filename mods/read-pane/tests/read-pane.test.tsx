import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'read-pane',
  component: 'Pane',
  requestId: 'read-pane',
  props: {
    title: 'Reads',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('counts reads per file and flags files read 3 or more times', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never }))

  const read = (file_path: string, id: string) => $.tool.call({ tool: 'Read', file_path, tool_use_id: id })

  await read('src/loop.ts', 'r1')
  await read('src/loop.ts', 'r2')
  await read('src/loop.ts', 'r3')
  await read('README.md', 'r4')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 files  1 read 3\+ times/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /3×/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /wasted context/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /README\.md/ })).toBeDefined()
    await ui.unmount()
  }
})
