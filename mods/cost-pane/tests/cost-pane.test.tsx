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
