import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  viewport: { columns: 120, rows: 40 },
} as const

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

const done = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The hub's switch and language, plus the empty box the engine would draw with no mod.
const hub = (on: any, off: string[] = [], lang = 'en') => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: off, version: 1 } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

const draw = async ($: any, surface: 'terminal' | 'desktop' = 'terminal') => {
  await $.session.start(START)

  return $.ui.mount({ ...BAND, surface })
}

const measure = (percent: number, usd?: number, rateLimits: { kind: string; percentUsed: number }[] = []) => ({
  context: { window: 200000, percent },
  rateLimits,
  cost: usd === undefined ? undefined : { usd },
  changed: ['context' as const],
})

const world = (on: any, off: string[] = [], lang = 'en') => {
  hub(on, off, lang)
  on('session.measure', (_: unknown, e: any) => ({ changed: e.changed }))
}

test('draws the context fill, the limits and the cost', async ($, on) => {
  world(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    await $.session.measure(measure(42, 1.5, [{ kind: 'five_hour', percentUsed: 30 }, { kind: 'seven_day', percentUsed: 61.4 }]))
    const ui = await draw($, surface)

    expect(await has(ui, /CONTEXT/)).toBe(true)
    expect(await has(ui, /42%/)).toBe(true)
    expect(await has(ui, /5H/)).toBe(true)
    expect(await has(ui, /30%/)).toBe(true)
    expect(await has(ui, /7D/)).toBe(true)
    expect(await has(ui, /61%/)).toBe(true)
    expect(await has(ui, /US\$ 1\.50/)).toBe(true)
    await ui.unmount()
  }
})

test('leaves the cost out when the host reports none', async ($, on) => {
  world(on)
  await $.session.measure(measure(10))

  const ui = await draw($)
  expect(await has(ui, /10%/)).toBe(true)
  expect(await has(ui, /US\$/)).toBe(false)
})

test('draws nothing before the first measurement', async ($, on) => {
  world(on)
  expect(await has(await draw($), /CONTEXT/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, ['usage-band'])
  await $.session.measure(measure(42))
  expect(await has(await draw($), /CONTEXT/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, [], 'pt')
  await $.session.measure(measure(42, undefined, [{ kind: 'spend_limit', percentUsed: 80 }]))

  const ui = await draw($)
  expect(await has(ui, /CONTEXTO/)).toBe(true)
  expect(await has(ui, /GASTO/)).toBe(true)
})

test('hides while a survey is shown above the prompt', async ($, on) => {
  world(on)
  await $.session.measure(measure(42))
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await has(ui, /CONTEXT/)).toBe(false)
})

test('draws the newest measurement only', async ($, on) => {
  world(on)
  await $.session.measure(measure(42, 1, [{ kind: 'five_hour', percentUsed: 30 }]))
  await $.session.measure(measure(77, 2.345))

  const ui = await draw($)
  expect(await has(ui, /77%/)).toBe(true)
  expect(await has(ui, /42%/)).toBe(false)
  expect(await has(ui, /5H/)).toBe(false)
  expect(await has(ui, /US\$ 2\.35/)).toBe(true)
})

test('shows 0% when the host has no context percent yet', async ($, on) => {
  world(on)
  await $.session.measure({ ...measure(0), context: { window: 200000 } } as never)

  expect(await has(await draw($), /^0%$/)).toBe(true)
})

test('names the spend limit in English and keeps an unknown kind as it came', async ($, on) => {
  world(on)
  await $.session.measure(measure(5, undefined, [{ kind: 'spend_limit', percentUsed: 12.6 }, { kind: 'opus_week', percentUsed: 3 }]))

  const ui = await draw($)
  expect(await has(ui, /SPEND/)).toBe(true)
  expect(await has(ui, /13%/)).toBe(true)
  expect(await has(ui, /OPUS_WEEK/)).toBe(true)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on, [], 'es')
  await $.session.measure(measure(42, undefined, [{ kind: 'spend_limit', percentUsed: 80 }]))

  const ui = await draw($)
  expect(await has(ui, /CONTEXTO/)).toBe(true)
  expect(await has(ui, /GASTO/)).toBe(true)
})
