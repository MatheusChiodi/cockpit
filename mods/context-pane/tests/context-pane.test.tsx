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
