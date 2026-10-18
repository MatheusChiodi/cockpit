import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'main-warning-band',
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

const branch = (on: any, name: string | null) => {
  mock.clock(on)
  on('process.run', () => (name === null ? done(128) : done(0, `${name}\n`)))
}

test('warns on a protected branch, on terminal and desktop', async ($, on) => {
  hub(on)
  branch(on, 'main')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await draw($, surface)

    expect(await has(ui, /main/)).toBe(true)
    expect(await has(ui, /is protected/)).toBe(true)
    expect(await has(ui, /git switch -c name/)).toBe(true)
    await ui.unmount()
  }
})

for (const name of ['master', 'production', 'prod']) {
  test(`warns on ${name} too`, async ($, on) => {
    hub(on)
    branch(on, name)
    expect(await has(await draw($), /is protected/)).toBe(true)
  })
}

test('stays quiet on a feature branch', async ($, on) => {
  hub(on)
  branch(on, 'feature/login')
  expect(await has(await draw($), /is protected/)).toBe(false)
})

test('stays quiet outside a repository', async ($, on) => {
  hub(on)
  branch(on, null)
  expect(await has(await draw($), /is protected/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  hub(on, ['main-warning-band'])
  branch(on, 'main')
  expect(await has(await draw($), /is protected/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  hub(on, [], 'pt')
  branch(on, 'main')

  const ui = await draw($)
  expect(await has(ui, /é protegida/)).toBe(true)
  expect(await has(ui, /git switch -c nome/)).toBe(true)
})

test('stays out of the way while a survey is shown', async ($, on) => {
  hub(on)
  branch(on, 'main')
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await has(ui, /is protected/)).toBe(false)
})

test('picks up a switch to a protected branch after the turn', async ($, on) => {
  let name = 'feature/login'
  hub(on)
  mock.clock(on)
  on('process.run', () => done(0, `${name}\n`))
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))

  const ui = await draw($)
  expect(await has(ui, /is protected/)).toBe(false)
  await ui.unmount()

  name = 'main'
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)

  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await has(after, /is protected/)).toBe(true)
})

test('rechecks the branch every 30 seconds', async ($, on) => {
  let name = 'main'
  hub(on)
  const clock = mock.clock(on)
  on('process.run', () => done(0, `${name}\n`))

  const ui = await draw($)
  expect(await has(ui, /is protected/)).toBe(true)
  await ui.unmount()

  name = 'fix/typo'
  await clock.advance(30000)

  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await has(after, /is protected/)).toBe(false)
})

test('keeps the bands drawn beneath it', async ($, on) => {
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('ui.render', { component: 'AbovePrompt' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)

    return <Text>other band</Text>
  })
  branch(on, 'master')

  const ui = await draw($)
  expect(await has(ui, /other band/)).toBe(true)
  expect(await has(ui, /is protected/)).toBe(true)
})

test('a branch named like a protected one is not protected', async ($, on) => {
  hub(on)
  branch(on, 'main-redesign')
  expect(await has(await draw($), /is protected/)).toBe(false)
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  hub(on, [], 'es')
  branch(on, 'prod')

  const ui = await draw($)
  expect(await has(ui, /RAMA/)).toBe(true)
  expect(await has(ui, /está protegida/)).toBe(true)
  expect(await has(ui, /git switch -c nombre/)).toBe(true)
})
