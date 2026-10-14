import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'prompt-history',
  component: 'Pane',
  requestId: 'prompt-history',
  props: {
    title: 'Prompts',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('lists typed prompts newest first and pressing one puts it back in the box', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  let filled = ''
  on('prompt.fill', (_$, e) => {
    filled = e.text

    return { isFilled: true }
  })

  await $.prompt.submit({ text: 'fix the login hook', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: 'add a test for it', wait: false, origin: { kind: 'composer' } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 typed/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /add a test for it/ })).toBeDefined()
    await ui.press({ key: 'prompt:1' })
    expect(filled).toBe('fix the login hook')
    await ui.unmount()
  }
})
