import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'cockpit',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const PANE = {
  plugin: 'cockpit',
  component: 'Pane',
  requestId: 'cockpit',
  props: {
    title: 'Cockpit',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('switches panels off and on, counting the ones left on', async ($, on) => {
  mock.store(on)

  const one = await $.command.run(run('off git-band'))
  expect(one.text).toContain('git-band off. 39 of 40 panels on')

  // Switching the same panel off twice counts once.
  const again = await $.command.run(run('off git-band'))
  expect(again.text).toContain('39 of 40 panels on')

  const back = await $.command.run(run('on git-band'))
  expect(back.text).toContain('git-band on. 40 of 40 panels on')

  const none = await $.command.run(run('off all'))
  expect(none.text).toContain('0 of 40 panels on')

  const unknown = await $.command.run(run('off nope'))
  expect(unknown.text).toContain('Unknown panel')
})

test('speaks English by default and switches to Portuguese and Spanish', async ($, on) => {
  mock.store(on)

  const pt = await $.command.run(run('lang pt'))
  expect(pt.text).toContain('Idioma definido para português')

  const inPt = await $.command.run(run('off git-band'))
  expect(inPt.text).toContain('git-band desligado. 39 de 40 painéis ligados')

  const es = await $.command.run(run('lang es'))
  expect(es.text).toContain('Idioma definido en español')

  const unknown = await $.command.run(run('lang fr'))
  expect(unknown.text).toContain('Idioma desconocido')

  await $.command.run(run('lang en'))
  await $.command.run(run('on all'))
})

test('the settings pane draws, toggles a panel and changes language by button', async ($, on) => {
  mock.store(on)

  // Terminal and desktop: the drawing may not depend on one surface.
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /40 of 40 panels on/ })).toBeDefined()
    await ui.press({ key: 'panel:git-band' })
    expect(await ui.find({ type: 'Text', text: /39 of 40 panels on/ })).toBeDefined()
    await ui.press({ key: 'lang:pt' })
    expect(await ui.find({ type: 'Text', text: /39 de 40 painéis ligados/ })).toBeDefined()
    await ui.press({ key: 'lang:en' })
    await ui.press({ key: 'all-on' })
    expect(await ui.find({ type: 'Text', text: /40 of 40 panels on/ })).toBeDefined()
    await ui.unmount()
  }
})
