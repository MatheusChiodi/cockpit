import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'test-pane',
  component: 'Pane',
  requestId: 'test-pane',
  props: {
    title: 'Test log',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const OUT = { stdout: '', stderr: '', interrupted: false }

test('logs each test run with its result and duration, ignoring other commands', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  let fails = false
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.advance(3100)

    return fails ? { result: OUT, isError: true as const } : { result: OUT }
  })

  await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 't0' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 't1' })
  fails = true
  await $.tool.call({ tool: 'Bash', command: 'pytest -q', tool_use_id: 't2' })

  const opened = await $.command.run({
    command: 'testlog',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  })
  expect(opened.text).toContain('Test log pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 runs · 1 failed/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /3\.1s npm test/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /3\.1s pytest -q/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /git status/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('shows the empty state before any run', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No test run yet/ })).toBeDefined()
  await ui.unmount()
})
