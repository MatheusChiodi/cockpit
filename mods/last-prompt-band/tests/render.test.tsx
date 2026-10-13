import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'last-prompt-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('a faixa mostra o último pedido digitado, no terminal e no desktop', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  // O que o motor desenharia na faixa sem nenhum mod: uma caixa vazia.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.prompt.submit({ text: 'refatore o hook de login', wait: false, origin: { kind: 'composer' } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /refatore o hook de login/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /PEDIDO/ })).toBeDefined()
    await ui.unmount()
  }
})
