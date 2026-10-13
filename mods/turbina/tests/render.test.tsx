import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'turbina',
  component: 'Pane',
  requestId: 'turbina',
  props: {
    title: 'Turbina',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('o painel de configuração desenha e alterna um painel pelo botão', async ($, on) => {
  mock.store(on)

  // Terminal e desktop: o desenho não pode depender de uma superfície só.
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /40 de 40 painéis ligados/ })).toBeDefined()
    await ui.press({ key: 'panel:git-band' })
    expect(await ui.find({ type: 'Text', text: /39 de 40 painéis ligados/ })).toBeDefined()
    await ui.press({ key: 'all-on' })
    expect(await ui.find({ type: 'Text', text: /40 de 40 painéis ligados/ })).toBeDefined()
    await ui.unmount()
  }
})
