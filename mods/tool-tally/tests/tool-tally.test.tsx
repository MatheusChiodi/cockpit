import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const PANE = {
  plugin: 'tool-tally',
  component: 'Pane',
  requestId: 'tool-tally',
  props: {
    title: 'Tools',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'tally',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('counts calls per tool, most used first', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'Read' }, () => ANSWER)

  expect((await $.command.run(RUN)).text).toBe('Tools pane opened.')

  await $.tool.call({ tool: 'Read', file_path: '/a', tool_use_id: '1' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: '2' })
  await $.tool.call({ tool: 'Bash', command: 'pwd', tool_use_id: '3' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /3 calls/ })).toBeDefined()
    const rows = await ui.findAll({ type: 'Text', text: /\d+ .* (Bash|Read)$/ })
    expect(rows.map(row => row.text)).toEqual([expect.stringContaining('Bash'), expect.stringContaining('Read')])
    expect(rows[0]?.text).toContain('2')
    await ui.unmount()
  }
})

test('says so before any tool is used', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /0 calls/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No tool used yet\./ })).toBeDefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  expect((await $.command.run(RUN)).text).toBe('Painel de ferramentas aberto.')
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: '1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 chamadas/ })).toBeDefined()
  await ui.unmount()
})
