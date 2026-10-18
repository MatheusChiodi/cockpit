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

const testlog = {
  command: 'testlog',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

test('does not log a test run that was refused', async ($, on) => {
  mock.clock(on)
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'blocked' }))

  await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: 'd1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No test run yet/ })).toBeDefined()
  await ui.unmount()
})

test('logs PowerShell runs by their first line, in milliseconds when short', async ($, on) => {
  const clock = mock.clock(on)
  on('tool.call', { tool: 'PowerShell' }, async () => {
    await clock.advance(420)

    return { result: OUT } as never
  })

  await $.tool.call({ tool: 'PowerShell', command: 'dotnet test\nWrite-Host done', tool_use_id: 'p1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /420ms dotnet test$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Write-Host/ })).toBeUndefined()
  await ui.unmount()
})

test('shows the newest run first', async ($, on) => {
  const clock = mock.clock(on)
  on('tool.call', { tool: 'Bash' }, async () => {
    await clock.advance(1000)

    return { result: OUT }
  })

  await $.tool.call({ tool: 'Bash', command: 'cargo test', tool_use_id: 'c1' })
  await $.tool.call({ tool: 'Bash', command: 'go test ./...', tool_use_id: 'g1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const lines = await ui.findAll({ type: 'Text', text: /(cargo|go) test/ })
  expect(lines.map(line => /(cargo|go) test/.exec(line.text)?.[1])).toEqual(['go', 'cargo'])
  await ui.unmount()
})

test('opens its own pane from /testlog and registers the command', async ($, on) => {
  const opened: string[] = []
  const names: string[] = []
  on('ui.open', (_: unknown, e: any) => {
    opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    names.push(e.name)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  await $.command.run(testlog)

  expect(names).toEqual(['testlog'])
  expect(opened).toEqual(['test-pane'])
})

test('speaks Portuguese and Spanish when the hub asks', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }) as never)

  expect((await $.command.run(testlog)).text).toBe('Painel do log de testes aberto.')
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Nenhum teste rodou ainda/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0 execuções · 0 falharam/ })).toBeDefined()
  await ui.unmount()

  lang = 'es'
  expect((await $.command.run(testlog)).text).toBe('Panel del registro de pruebas abierto.')
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Aún no se ejecutaron pruebas/ })).toBeDefined()
  await ui.unmount()
})
