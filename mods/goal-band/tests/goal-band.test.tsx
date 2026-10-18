import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'goal-band',
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

const goal = (args: string) =>
  ({
    command: 'goal',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  }) as const

const INPUT = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as never

const world = (on: any, held?: string, off: string[] = [], lang = 'en') => {
  mock.store(on, held === undefined ? {} : { 'goal:/work': held })
  hub(on, off, lang)
  on('session.root', () => ({ value: '/work' }))
  on('command.register', (_: unknown, e: { name: string }) => ({ value: { command: e.name } }))
  on('prompt.compose', () => ({ sections: [] }))
}

test('pins a goal above the prompt and in the system prompt, and clears it', async ($, on) => {
  world(on)
  await $.session.start(START)

  expect((await $.command.run(goal(''))).text).toBe('No goal. Use /goal <goal>.')
  expect((await $.command.run(goal('ship the login'))).text).toContain('Goal pinned')
  expect((await $.command.run(goal(''))).text).toBe('Goal: ship the login')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await has(ui, /GOAL/)).toBe(true)
    expect(await has(ui, /ship the login/)).toBe(true)
    await ui.unmount()
  }

  const composed = await $.prompt.compose(INPUT)
  expect(composed.sections.map(section => section.id)).toEqual(['goal-band:goal'])
  expect(composed.sections[0]?.text).toContain('ship the login')

  expect((await $.command.run(goal('clear'))).text).toBe('Goal removed.')
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /GOAL/)).toBe(false)
  expect((await $.prompt.compose(INPUT)).sections).toEqual([])
})

test('restores the goal of the project when the session starts', async ($, on) => {
  world(on, 'kept from before')
  const ui = await draw($)

  expect(await has(ui, /kept from before/)).toBe(true)
})

test('cuts a long goal to 200 characters', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run(goal('x'.repeat(300)))

  expect((await $.command.run(goal(''))).text).toBe(`Goal: ${'x'.repeat(200)}`)
})

test('draws nothing without a goal', async ($, on) => {
  world(on)
  expect(await has(await draw($), /GOAL/)).toBe(false)
})

test('hides while the hub lists it as off', async ($, on) => {
  world(on, 'hidden goal', ['goal-band'])
  expect(await has(await draw($), /GOAL/)).toBe(false)
})

test('speaks the language set in the hub', async ($, on) => {
  world(on, undefined, [], 'pt')
  await $.session.start(START)

  expect((await $.command.run(goal(''))).text).toBe('Sem objetivo. Use /goal <objetivo>.')
  await $.command.run(goal('lançar o login'))
  expect(await has(await $.ui.mount({ ...BAND, surface: 'terminal' }), /OBJETIVO/)).toBe(true)
  expect((await $.command.run(goal('clear'))).text).toBe('Objetivo removido.')
})

test('hides while a survey is shown above the prompt', async ($, on) => {
  world(on, 'a goal behind the survey')
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await has(ui, /GOAL/)).toBe(false)
})

test('keeps the goal per project, under the root of the session', async ($, on) => {
  const sets: { key: string; value: unknown }[] = []
  hub(on)
  on('session.root', () => ({ value: '/work' }))
  on('command.register', (_: unknown, e: { name: string }) => ({ value: { command: e.name } }))
  on('store.get', (_: unknown, e: { key: string }) => ({ value: e.key === 'goal:/other' ? 'not this project' : undefined }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => {
    sets.push(e)

    return { value: undefined }
  })

  expect(await has(await draw($), /not this project/)).toBe(false)
  await $.command.run(goal('  trimmed goal  '))
  await $.command.run(goal('clear'))
  expect(sets).toEqual([
    { key: 'goal:/work', value: 'trimmed goal' },
    { key: 'goal:/work', value: '' },
  ])
})

test('ignores a stored value that is not text', async ($, on) => {
  mock.store(on, { 'goal:/work': { not: 'a string' } })
  hub(on)
  on('session.root', () => ({ value: '/work' }))
  on('command.register', (_: unknown, e: { name: string }) => ({ value: { command: e.name } }))
  on('prompt.compose', () => ({ sections: [] }))

  expect(await has(await draw($), /GOAL/)).toBe(false)
  expect((await $.command.run(goal(''))).text).toBe('No goal. Use /goal <goal>.')
  expect((await $.prompt.compose(INPUT)).sections).toEqual([])
})

test('adds its section after the ones composed beneath', async ($, on) => {
  mock.store(on, { 'goal:/work': 'stay on track' })
  hub(on)
  on('session.root', () => ({ value: '/work' }))
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'base text', scope: 'session' as const }] }))

  const composed = await $.prompt.compose(INPUT)
  expect(composed.sections.map(section => section.id)).toEqual(['base', 'goal-band:goal'])
  expect(composed.sections[1]?.text).toContain("# The user's current goal\nstay on track")
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  world(on, undefined, [], 'es')
  await $.session.start(START)

  expect((await $.command.run(goal(''))).text).toBe('Sin objetivo. Usa /goal <objetivo>.')
  expect((await $.command.run(goal('lanzar el login'))).text).toBe('Objetivo fijado (Claude lo verá desde el próximo prompt).')
  expect((await $.command.run(goal(''))).text).toBe('Objetivo: lanzar el login')
  expect((await $.command.run(goal('clear'))).text).toBe('Objetivo eliminado.')
})
