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

const RUN = {
  command: 'timeline',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

test('opens the pane and shows the empty log before anything happened', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const ran = await $.command.run(RUN)
  expect(ran.text).toBe('Timeline opened.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 events/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Nothing happened yet/ })).toBeDefined()
  await ui.unmount()
})

test('leaves out the calls and turn ends of subagents', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'agent-only', tool_use_id: 's1', ...{ agentId: 'agent-1' } })
  await $.turn.complete({ answer: 'x', durationMs: 1000, isAborted: false, turnId: 'a1', reason: 'answer', agentId: 'agent-1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 events/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /agent-only/ })).toBeUndefined()
  await ui.unmount()
})

test('names a call by its file path and folds whitespace in prompts', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('tool.call', { tool: 'Read' }, () => ({ deny: 'nope' }))

  await $.prompt.submit({ text: '  fix\n\n  the   bug  ', wait: false, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Read', file_path: '/src/app.ts', tool_use_id: 'r1' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /fix the bug/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Read \/src\/app\.ts/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /✗/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Portuguese and Spanish when the hub says so', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.command.run(RUN)).text).toBe('Linha do tempo aberta.')
  await $.turn.complete({ answer: '', durationMs: 1500, isAborted: true, turnId: 'p1', reason: 'aborted' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 eventos/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /turno interrompido {2}1\.5s/ })).toBeDefined()
  await ui.unmount()

  lang = 'es'
  expect((await $.command.run(RUN)).text).toBe('Línea de tiempo abierta.')
  await $.turn.complete({ answer: '', durationMs: 2000, isAborted: false, turnId: 'e1', reason: 'error' })
  const again = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await again.find({ type: 'Text', text: /turno con error {2}2\.0s/ })).toBeDefined()
  await again.unmount()
})
