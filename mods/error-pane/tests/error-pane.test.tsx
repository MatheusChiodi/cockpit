import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'error-pane',
  component: 'Pane',
  requestId: 'error-pane',
  props: {
    title: 'Errors',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('lists failed and denied calls with a short input and the first line of the error', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command === 'ls'
      ? { result: { stdout: 'ok', stderr: '', interrupted: false } }
      : { deny: 'blocked by a guard\nsecond line' },
  )
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never, text: '\nfile not found: a.ts\nmore', isError: true }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'ok' })
  await $.tool.call({ tool: 'Bash', command: 'rm -rf build', tool_use_id: 'no' })
  await $.tool.call({ tool: 'Read', file_path: 'a.ts', tool_use_id: 'bad' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 failed or denied/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /rm -rf build/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /blocked by a guard/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /file not found: a\.ts/ })).toBeDefined()
    await ui.unmount()
  }
})
