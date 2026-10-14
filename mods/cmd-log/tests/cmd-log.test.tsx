import { expect, mock, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const PANE = {
  plugin: 'cmd-log',
  component: 'Pane',
  requestId: 'cmd-log',
  props: {
    title: 'Commands',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'cmdlog',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('logs commands with status and duration, failed ones marked', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', { tool: 'Bash' }, async (_$, e) => {
    await clock.sleep(e.command.startsWith('slow') ? 1500 : 20)

    return e.command.startsWith('bad') ? { deny: 'no' } : ANSWER
  })
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  expect((await $.command.run(RUN)).text).toBe('Commands pane opened.')

  const slow = $.tool.call({ tool: 'Bash', command: 'slow   build', tool_use_id: '1' })
  await clock.advance(1500)
  await slow
  const bad = $.tool.call({ tool: 'Bash', command: 'bad cmd', tool_use_id: '2' })
  await clock.advance(20)
  await bad
  await $.tool.call({ tool: 'PowerShell', command: 'Get-Date', tool_use_id: '3' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /3 run · 1 failed/ })).toBeDefined()
    // One row per command: the line holds the mark, time and command; the mark alone is a Text of its own.
    const rows = (await ui.findAll({ type: 'Text', text: /[✓✗]/ })).map(row => row.text ?? '').filter(text => text.length > 1)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain('✓')
    expect(rows[0]).toContain('1.5s')
    // Whitespace in the command is collapsed.
    expect(rows[0]).toContain('slow build')
    expect(rows[1]).toContain('✗')
    expect(rows[1]).toContain('20ms')
    expect(rows[2]).toContain('Get-Date')
    await ui.unmount()
  }
})

test('says so before any command ran', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /0 run · 0 failed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No command run yet\./ })).toBeDefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  mock.clock(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  expect((await $.command.run(RUN)).text).toBe('Painel de comandos aberto.')
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: '1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 rodados · 0 com erro/ })).toBeDefined()
  await ui.unmount()
})
