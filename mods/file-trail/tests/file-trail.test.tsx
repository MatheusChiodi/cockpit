import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const PANE = {
  plugin: 'file-trail',
  component: 'Pane',
  requestId: 'file-trail',
  props: {
    title: 'Files',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'trail',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('lists the files touched, newest first, with the strongest kind and a count', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', { tool: 'Read' }, () => ANSWER)
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  expect((await $.command.run(RUN)).text).toBe('Files pane opened.')

  await $.tool.call({ tool: 'Read', file_path: '/src/a.ts', tool_use_id: '1' })
  await $.tool.call({ tool: 'Edit', file_path: '/src/a.ts', old_string: 'x', new_string: 'y', tool_use_id: '2' })
  // A later read never downgrades an edit.
  await $.tool.call({ tool: 'Read', file_path: '/src/a.ts', tool_use_id: '3' })
  await $.tool.call({ tool: 'Write', file_path: '/src/b.ts', content: '', tool_use_id: '4' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 touched · 2 changed/ })).toBeDefined()
    const rows = (await ui.findAll({ type: 'Text', text: /\/src\// })).map(row => row.text)
    expect(rows[0]).toContain('/src/b.ts')
    expect(rows[0]).toContain('W')
    expect(rows[1]).toContain('/src/a.ts')
    expect(rows[1]).toContain('M')
    expect(rows[1]).toContain('3×')
    await ui.unmount()
  }
})

test('does not record a call that was denied', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'blocked' }))

  await $.tool.call({ tool: 'Edit', file_path: '/src/x.ts', old_string: 'a', new_string: 'b', tool_use_id: '1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 touched/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No file touched yet\./ })).toBeDefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', { tool: 'Read' }, () => ANSWER)

  expect((await $.command.run(RUN)).text).toBe('Painel de arquivos aberto.')
  await $.tool.call({ tool: 'Read', file_path: '/a.ts', tool_use_id: '1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 tocados · 0 alterados/ })).toBeDefined()
  await ui.unmount()
})
