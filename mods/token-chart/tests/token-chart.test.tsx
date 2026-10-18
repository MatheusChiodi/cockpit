import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'token-chart',
  component: 'Pane',
  requestId: 'token-chart',
  props: {
    title: 'Tokens',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const usage = (out: number) => ({
  input_tokens: 1,
  output_tokens: out,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  model: 'm',
})

test('draws a gauge per turn scaled to the largest and totals the heading', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  await $.turn.complete({ answer: 'a', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage: usage(500) })
  await $.turn.complete({ answer: 'b', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer', usage: usage(2000) })
  // A subagent's turn is not the main loop's.
  await $.turn.complete({ answer: 'c', durationMs: 1, isAborted: false, turnId: 't3', reason: 'answer', agentId: 'sub', usage: usage(9000) })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2\.5k out  2 turns/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2\.0k/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /━+●/ })).toBeDefined()
    await ui.unmount()
  }
})

const RUN = {
  command: 'tokens',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

test('opens the pane and says so before any turn finished', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))

  expect((await $.command.run(RUN)).text).toBe('Tokens pane opened.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 out  0 turns/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No turn has finished yet\./ })).toBeDefined()
  await ui.unmount()
})

test('skips a turn that reports no usage', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  await $.turn.complete({ answer: 'a', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await $.turn.complete({ answer: 'b', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer', usage: usage(999) })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /999 out  1 turns/ })).toBeDefined()
  await ui.unmount()
})

test('lists the newest turns first and only as many as fit', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  for (const n of [1, 2, 3, 4, 5, 6]) {
    await $.turn.complete({ answer: 'a', durationMs: 1, isAborted: false, turnId: `t${n}`, reason: 'answer', usage: usage(n * 100) })
  }

  const ui = await $.ui.mount({ ...PANE, viewport: { columns: 120, rows: 9 }, surface: 'terminal' })
  const rows = (await ui.findAll({ type: 'Text', text: /#\d/ })).map(row => row.text ?? '').filter(text => /\d00/.test(text))
  expect(rows).toHaveLength(3)
  expect(rows[0]).toContain('#6')
  expect(rows[0]).toContain('600')
  expect(rows[2]).toContain('#4')
  expect(await ui.find({ type: 'Text', text: /#1\b/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks Portuguese and Spanish when the hub says so', async ($, on) => {
  const hub = { lang: 'pt' as 'pt' | 'es' }
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: hub.lang, version: 1 } }))

  expect((await $.command.run(RUN)).text).toBe('Painel de tokens aberto.')
  const pt = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pt.find({ type: 'Text', text: /0 de saída  0 turnos/ })).toBeDefined()
  expect(await pt.find({ type: 'Text', text: /Nenhum turno terminou ainda\./ })).toBeDefined()
  await pt.unmount()

  hub.lang = 'es'
  expect((await $.command.run(RUN)).text).toBe('Panel de tokens abierto.')
  const es = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await es.find({ type: 'Text', text: /Ningún turno ha terminado aún\./ })).toBeDefined()
  await es.unmount()
})
