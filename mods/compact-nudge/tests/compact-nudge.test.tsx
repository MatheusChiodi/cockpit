import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'compact-nudge',
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

const measure = (percent: number) => ({
  context: { window: 200000, percent },
  rateLimits: [],
  changed: ['context' as const],
})

// The world beneath the mod: what the engine would draw with no mod (an empty box), and the toasts.
const world = (on: On) => {
  const toasts: string[] = []
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return toasts
}

test('appears when the context passes 75% and offers to compact', async ($, on) => {
  world(on)
  await $.session.measure(measure(82))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /COMPACT/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /82%/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /context almost full/ })).toBeDefined()
    expect(await ui.find({ key: 'compact' })).toBeDefined()
    await ui.unmount()
  }
})

test('stays hidden while the context is below the threshold', async ($, on) => {
  world(on)
  await $.session.measure(measure(60))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /COMPACT/ })).toBeUndefined()
  expect(await ui.find({ key: 'compact' })).toBeUndefined()
  await ui.unmount()
})

test('the button compacts and says so', async ($, on) => {
  const toasts = world(on)
  on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'summary', toolUses: [] }] }))
  await $.session.measure(measure(90))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'compact' })

  expect(toasts).toEqual(['Conversation compacted.'])
  await ui.unmount()
})

test('says it could not compact when a hook vetoes it', async ($, on) => {
  const toasts = world(on)
  on('session.compact', () => ({ skip: 'vetoed' }))
  await $.session.measure(measure(90))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'compact' })

  expect(toasts).toEqual(["Couldn't compact right now (turn in progress?)."])
  await ui.unmount()
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['compact-nudge'], version: 1 } }))
  await $.session.measure(measure(95))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /COMPACT/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.session.measure(measure(80))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /contexto quase cheio/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /COMPACTAR/ })).toBeDefined()
  await ui.unmount()
})

test('shows at exactly 75% and hides again when the context drops', async ($, on) => {
  world(on)
  await $.session.measure(measure(75))

  const at = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await at.find({ type: 'Text', text: /75%/ })).toBeDefined()
  await at.unmount()

  await $.session.measure(measure(20))
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /COMPACT/ })).toBeUndefined()
  await after.unmount()
})

test('reads a measure without a percent as an empty context', async ($, on) => {
  world(on)
  await $.session.measure(measure(90))
  await $.session.measure({ context: { window: 200000 }, rateLimits: [], changed: ['context'] })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /COMPACT/ })).toBeUndefined()
  await ui.unmount()
})

test('says it could not compact when compacting throws', async ($, on) => {
  const toasts = world(on)
  on('session.compact', () => {
    throw new Error('turn in progress')
  })
  await $.session.measure(measure(90))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'compact' })

  expect(toasts).toEqual(["Couldn't compact right now (turn in progress?)."])
  await ui.unmount()
})

test('hides while a survey is open', async ($, on) => {
  world(on)
  await $.session.measure(measure(90))

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await ui.find({ key: 'compact' })).toBeUndefined()
  await ui.unmount()
})

test('speaks Spanish in the band and the toasts, and Portuguese in the toasts', async ($, on) => {
  const toasts = world(on)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  let veto = false
  on('session.compact', () => (veto ? { skip: 'vetoed' } : { messages: [{ role: 'user' as const, text: 'summary', toolUses: [] }] }))
  await $.session.measure(measure(88))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /contexto casi lleno/ })).toBeDefined()
  await ui.press({ key: 'compact' })
  veto = true
  await ui.press({ key: 'compact' })
  lang = 'pt'
  await ui.press({ key: 'compact' })
  veto = false
  await ui.press({ key: 'compact' })
  await ui.unmount()

  expect(toasts).toEqual([
    'Conversación compactada.',
    'No se pudo compactar ahora (¿turno en curso?).',
    'Não deu para compactar agora (turno em andamento?).',
    'Conversa compactada.',
  ])
})
