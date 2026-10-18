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
  expect(one.text).toContain('git-band off. 51 of 52 panels on')

  // Switching the same panel off twice counts once.
  const again = await $.command.run(run('off git-band'))
  expect(again.text).toContain('51 of 52 panels on')

  const back = await $.command.run(run('on git-band'))
  expect(back.text).toContain('git-band on. 52 of 52 panels on')

  const none = await $.command.run(run('off all'))
  expect(none.text).toContain('0 of 52 panels on')

  const unknown = await $.command.run(run('off nope'))
  expect(unknown.text).toContain('Unknown panel')
})

test('speaks English by default and switches to Portuguese and Spanish', async ($, on) => {
  mock.store(on)

  const pt = await $.command.run(run('lang pt'))
  expect(pt.text).toContain('Idioma definido para português')

  const inPt = await $.command.run(run('off git-band'))
  expect(inPt.text).toContain('git-band desligado. 51 de 52 painéis ligados')

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

    expect(await ui.find({ type: 'Text', text: /52 of 52 panels on/ })).toBeDefined()
    await ui.press({ key: 'panel:git-band' })
    expect(await ui.find({ type: 'Text', text: /51 of 52 panels on/ })).toBeDefined()
    await ui.press({ key: 'lang:pt' })
    expect(await ui.find({ type: 'Text', text: /51 de 52 painéis ligados/ })).toBeDefined()
    await ui.press({ key: 'lang:en' })
    await ui.press({ key: 'all-on' })
    expect(await ui.find({ type: 'Text', text: /52 of 52 panels on/ })).toBeDefined()
    await ui.unmount()
  }
})

const START = { cwd: '/work', surface: 'terminal', isInteractive: true } as const

// The panel count comes from the catalog and grows with it: read it from the answer.
const counts = (text: string | undefined) => {
  const found = /(\d+) (?:of|de) (\d+)/.exec(text ?? '')

  return { on: Number(found?.[1]), total: Number(found?.[2]) }
}

test('restores the switched-off panels and the language kept from the last session', async ($, on) => {
  mock.store(on, { off: ['git-band', 3], lang: 'pt' })
  const registered: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    registered.push(e.description)

    return { value: { command: e.name } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.session.start(START)
  expect(registered).toEqual(['Configurações da Cockpit: liga e desliga painéis e escolhe o idioma'])

  const opened = await $.command.run(run(''))
  const { on: left, total } = counts(opened.text)
  expect(opened.text).toContain('painéis ligados. Enter ou clique alterna; Esc fecha.')
  expect(left).toBe(total - 1)
})

test('a stored language it does not know falls back to English', async ($, on) => {
  mock.store(on, { lang: 'fr', off: 'git-band' })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.session.start(START)
  const opened = await $.command.run(run(''))
  const { on: left, total } = counts(opened.text)

  expect(opened.text).toContain('panels on. Enter or click toggles; Esc closes.')
  expect(left).toBe(total)
})

test('opens the pane focused for any other argument', async ($, on) => {
  mock.store(on)
  const opened: { id: string; focus?: boolean; closeOnEscape?: boolean }[] = []
  on('ui.open', (_$: unknown, e: any) => {
    opened.push({ id: e.id, focus: e.focus, closeOnEscape: e.closeOnEscape })

    return { value: { isPlaced: true } }
  })

  await $.command.run(run(''))
  await $.command.run(run('show'))

  expect(opened).toEqual([
    { id: 'cockpit', focus: true, closeOnEscape: true },
    { id: 'cockpit', focus: true, closeOnEscape: true },
  ])
})

test('reads the action and the panel in any case, and asks for a panel name', async ($, on) => {
  mock.store(on)

  const off = await $.command.run(run('  OFF   Git-Band '))
  expect(off.text).toContain('git-band off.')

  const missing = await $.command.run(run('on'))
  expect(missing.text).toBe('Unknown panel: . Run /cockpit to see the list.')

  const all = await $.command.run(run('ON ALL'))
  const { on: left, total } = counts(all.text)
  expect(all.text?.startsWith('all on.')).toBe(true)
  expect(left).toBe(total)
})

test('the pane turns everything off by button and titles the groups in the chosen language', async ($, on) => {
  mock.store(on)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /SESSION/ })).toBeDefined()

  await ui.press({ key: 'all-off' })
  expect(await ui.find({ type: 'Text', text: /\b0 of \d+ panels on/ })).toBeDefined()

  await ui.press({ key: 'lang:es' })
  expect(await ui.find({ type: 'Text', text: /\b0 de \d+ paneles activos/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /DÍA A DÍA/ })).toBeDefined()

  await ui.press({ key: 'lang:pt' })
  expect(await ui.find({ type: 'Text', text: /SESSÃO/ })).toBeDefined()

  await ui.press({ key: 'all-on' })
  await ui.press({ key: 'lang:en' })
  await ui.unmount()
})

test('says unknown panels and languages in Spanish', async ($, on) => {
  mock.store(on)

  await $.command.run(run('lang es'))
  expect((await $.command.run(run('off nope'))).text).toBe('Panel desconocido: nope. Ejecuta /cockpit para ver la lista.')
  expect((await $.command.run(run('off git-band'))).text).toContain('git-band desactivado.')
  expect((await $.command.run(run('lang'))).text).toBe('Idioma desconocido: . Usa en, pt o es.')

  await $.command.run(run('on all'))
  await $.command.run(run('lang en'))
})
