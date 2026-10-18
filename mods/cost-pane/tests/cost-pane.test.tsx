import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'cost-pane',
  component: 'Pane',
  requestId: 'cost-pane',
  props: {
    title: 'Spend',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const measure = (usd: number) => ({
  context: { window: 200000 },
  rateLimits: [],
  cost: { usd },
  changed: ['cost' as const],
})

test('prices each turn by the difference between measurements and totals the heading', async ($, on) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  const done = (turnId: string) => ({ answer: '', durationMs: 1, isAborted: false, turnId, reason: 'answer' as const })

  await $.session.measure(measure(0.1))
  await $.session.measure(measure(0.25))
  await $.turn.complete(done('t1'))
  await $.session.measure(measure(0.75))
  await $.turn.complete(done('t2'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /\$0\.750 total  2 turns/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\$0\.250/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\$0\.500/ })).toBeDefined()
    await ui.unmount()
  }
})

const done = (turnId: string, agentId?: string) => ({
  answer: '',
  durationMs: 1,
  isAborted: false,
  turnId,
  reason: 'answer' as const,
  ...(agentId === undefined ? {} : { agentId }),
})

const world = (on: any) => {
  on('session.measure', (_$: unknown, e: any) => ({ changed: e.changed }))
  on('turn.complete', (_$: unknown, e: any) => ({ text: e.answer }))
}

test('shows the empty message before any turn is priced', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No turn has been priced yet/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\$0\.000 total  0 turns/ })).toBeDefined()
  await ui.unmount()
})

test('ignores subagent turns, free turns and cost that goes down', async ($, on) => {
  world(on)

  await $.session.measure(measure(0.5))
  await $.turn.complete(done('t1', 'sub'))
  await $.turn.complete(done('t1'))
  await $.turn.complete(done('t2'))
  await $.session.measure(measure(0.2))
  await $.session.measure(measure(1.7))
  await $.turn.complete(done('t3'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /\$2\.00 total  2 turns/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\$1\.50/ })).toBeDefined()
  await ui.unmount()
})

test('a measurement without cost changes nothing', async ($, on) => {
  world(on)

  await $.session.measure({ context: { window: 200000 }, rateLimits: [], changed: ['context'] } as never)
  await $.turn.complete(done('t1'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 turns/ })).toBeDefined()
  await ui.unmount()
})

test('registers /spend and opens the pane, in Portuguese from the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const registered: string[] = []
  on('command.register', (_$, e) => {
    registered.push(`${e.name}: ${e.description}`)

    return { value: { command: e.name } }
  })
  const titles: string[] = []
  on('ui.open', (_$, e) => {
    titles.push(String(e.title))

    return { value: { isPlaced: true } }
  })

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  expect(registered[0]).toBe('spend: Abre o painel com o custo de cada turno e o total da sessão')

  const ran = await $.command.run({ command: 'spend', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } })
  expect(ran.text).toBe('Painel de gastos aberto.')
  expect(titles).toEqual(['Gastos'])

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Nenhum turno foi precificado/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish from the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.session.measure(measure(0.3))
  await $.turn.complete(done('t1'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /\$0\.300 en total  1 turnos/ })).toBeDefined()
  await ui.unmount()
})
