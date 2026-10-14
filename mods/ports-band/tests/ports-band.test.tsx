import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'ports-band',
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

const world = (on: any, up: () => number[], off: string[] = [], lang = 'en') => {
  hub(on, off, lang)
  on('http.fetch', (_: unknown, e: { url: string }) => {
    if (!up().some(port => e.url === `http://localhost:${port}/`)) {
      throw new Error('connection refused')
    }

    return { value: { status: 200, ok: true, headers: {}, text: '' } }
  })
}

// Starts the session and lets one probe round run.
const probed = async ($: any, on: any, up: () => number[], off: string[] = [], lang = 'en') => {
  const clock = mock.clock(on)
  world(on, up, off, lang)
  await $.session.start(START)
  await clock.advance(20000)

  return clock
}

test('lists the dev ports that answer', async ($, on) => {
  await probed($, on, () => [3000, 5173])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await has(ui, /LIVE/)).toBe(true)
    expect(await has(ui, /localhost:3000/)).toBe(true)
    expect(await has(ui, /localhost:5173/)).toBe(true)
    expect(await has(ui, /localhost:8080/)).toBe(false)
    await ui.unmount()
  }
})

test('follows a server that goes down', async ($, on) => {
  let up = [3000]
  const clock = await probed($, on, () => up)
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /localhost:3000/)).toBe(true)

  up = []
  await clock.advance(20000)
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /LIVE/)).toBe(false)
})

test('draws nothing when no port answers', async ($, on) => {
  await probed($, on, () => [])
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /LIVE/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  await probed($, on, () => [3000], ['ports-band'])
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /LIVE/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  await probed($, on, () => [3000], [], 'pt')
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /NO AR/)).toBe(true)
})
