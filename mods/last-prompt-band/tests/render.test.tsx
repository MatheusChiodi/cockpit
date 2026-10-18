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

// The engine beneath: what a prompt resolves to, the hub's switch and language, and the empty band.
const world = (on: any, answer: (text: string) => object = text => ({ text }), off: string[] = [], lang = 'en') => {
  on('prompt.submit', (_: unknown, e: { text: string }) => answer(e.text))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

test('draws nothing before the first request', async ($, on) => {
  world(on)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /REQUEST/ })).toBeUndefined()
  await ui.unmount()
})

test('folds whitespace and keeps at most 140 characters', async ($, on) => {
  world(on)

  await $.prompt.submit({ text: `  fix   the\n\nbuild ${'y'.repeat(200)}`, wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const shown = `fix the build ${'y'.repeat(200)}`.slice(0, 140)
  expect(await ui.find({ type: 'Text', text: new RegExp(`^${shown}$`) })).toBeDefined()
  await ui.unmount()
})

test('leaves out prompts that were not typed, or that were dropped', async ($, on) => {
  world(on, text => (text === 'dropped' ? { drop: 'blocked' } : { text }))

  await $.prompt.submit({ text: 'typed one', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: 'from a notification', wait: false, origin: { kind: 'task-notification' } })
  await $.prompt.submit({ text: 'dropped', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /typed one/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /from a notification|dropped/ })).toBeUndefined()
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, undefined, ['last-prompt-band'])

  await $.prompt.submit({ text: 'hidden request', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /hidden request/ })).toBeUndefined()
  await ui.unmount()
})

test('hides under a survey', async ($, on) => {
  world(on)

  await $.prompt.submit({ text: 'a request', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /a request/ })).toBeUndefined()
  await ui.unmount()
})

test('labels the band in the language set in the hub', async ($, on) => {
  world(on, undefined, [], 'pt')

  await $.prompt.submit({ text: 'corrija o login', wait: false, origin: { kind: 'composer' } })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /PEDIDO/ })).toBeDefined()
  await ui.unmount()
})
