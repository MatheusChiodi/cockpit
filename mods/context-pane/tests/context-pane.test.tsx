import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'context-pane',
  component: 'Pane',
  requestId: 'context-pane',
  props: {
    title: 'Window',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const category = (name: string, tokens: number, kind: 'used' | 'free' | 'buffer') => ({
  name,
  tokens,
  color: 'inactive',
  isDeferred: false,
  kind,
})

test('draws the window by category with its share and refreshes on the button', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  let tokens = 40000
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: {
        window: 200000,
        breakdown: {
          categories: [category('Messages', tokens, 'used'), category('Free space', 200000 - tokens, 'free')],
          totalTokens: tokens,
          maxTokens: 200000,
          rawMaxTokens: 200000,
          percentage: Math.round((tokens / 200000) * 100),
        },
      },
    } as never,
  }))

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /40\.0k of 200\.0k  20%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Messages/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /80%/ })).toBeDefined()

    tokens = 100000
    await ui.press({ key: 'refresh' })
    expect(await ui.find({ type: 'Text', text: /100\.0k of 200\.0k  50%/ })).toBeDefined()
    tokens = 40000
    await ui.press({ key: 'refresh' })
    await ui.unmount()
  }
})

const usage = (categories: object[], total: number, max = 200000) => ({
  value: {
    startedAt: 0,
    context: {
      window: max,
      breakdown: { categories, totalTokens: total, maxTokens: max, rawMaxTokens: max, percentage: Math.round((total / max) * 100) },
    },
  } as never,
})

const run = { command: 'window', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } } as const

const DONE = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

test('says nothing is measured before the first reading', async ($, on) => {
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 } } as never }))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Nothing measured yet/ })).toBeDefined()

  await ui.press({ key: 'refresh' })
  expect(await ui.find({ type: 'Text', text: /Nothing measured yet/ })).toBeDefined()
  await ui.unmount()
})

test('opens the pane from the command after reading the window', async ($, on) => {
  const opened: { id: string; title?: string }[] = []
  on('session.usage', () => usage([category('Messages', 1500, 'used')], 1500))
  on('ui.open', (_$, e) => {
    opened.push(e as never)

    return { value: undefined as never }
  })

  expect((await $.command.run(run)).text).toBe('Window pane opened.')
  expect(opened[0]).toMatchObject({ id: 'context-pane', title: 'Window' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1\.5k of 200\.0k  1%/ })).toBeDefined()
  await ui.unmount()
})

test('leaves out deferred and empty categories', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.usage', () =>
    usage([category('Messages', 900, 'used'), category('Empty bucket', 0, 'used'), { ...category('MCP tools', 5000, 'used'), kind: 'deferred' }], 900),
  )

  await $.turn.complete(DONE)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /900 of 200\.0k  0%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Messages/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Empty bucket/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /MCP tools/ })).toBeUndefined()
  await ui.unmount()
})

test('does not read the window when a subagent turn ends', async ($, on) => {
  let reads = 0
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.usage', () => {
    reads += 1

    return usage([category('Messages', 900, 'used')], 900)
  })

  await $.turn.complete({ ...DONE, agentId: 'a1' } as never)
  expect(reads).toBe(0)

  await $.turn.complete(DONE)
  expect(reads).toBe(1)
})

test('speaks the language set in the hub', async ($, on) => {
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 } } as never }))
  on('ui.open', () => ({ value: undefined as never }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Painel da janela aberto.')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Nada medido ainda/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('session.usage', () => usage([category('Messages', 50000, 'used')], 50000))
  on('ui.open', () => ({ value: undefined as never }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Panel de la ventana abierto.')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /50\.0k de 200\.0k  25%/ })).toBeDefined()
  await ui.unmount()
})
