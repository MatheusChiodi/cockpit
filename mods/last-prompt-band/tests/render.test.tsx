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

test('the band shows the last typed request, on terminal and desktop', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  // What the engine would draw in the band with no mod: an empty box.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.prompt.submit({ text: 'refactor the login hook', wait: false, origin: { kind: 'composer' } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /refactor the login hook/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /REQUEST/ })).toBeDefined()
    await ui.unmount()
  }
})
