import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'links-pane',
  component: 'Pane',
  requestId: 'links-pane',
  props: {
    title: 'Links',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('collects the URLs of the answers, newest first, and pressing one copies it', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  let copied = ''
  on('ui.copy', (_$, e) => {
    copied = e.text

    return { value: { isCopied: true } }
  })

  const done = (answer: string, turnId: string) => ({ answer, durationMs: 1, isAborted: false, turnId, reason: 'answer' as const })

  await $.turn.complete(done('See https://docs.example.com/api/auth. Also (https://example.com/a).', 't1'))
  await $.turn.complete(done('Fixed in https://github.com/acme/app/pull/42, again https://example.com/a', 't2'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /3 urls/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /https:\/\/docs\.example\.com\/api\/auth$/ })).toBeDefined()
    await ui.press({ key: 'link:https://github.com/acme/app/pull/42' })
    expect(copied).toBe('https://github.com/acme/app/pull/42')
    await ui.unmount()
  }
})
