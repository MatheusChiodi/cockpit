import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'scripts-pane',
  component: 'Pane',
  requestId: 'scripts-pane',
  props: {
    title: 'Scripts',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'scripts',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

test('lists the scripts and puts the chosen one in the prompt box', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', () => ({
    value: JSON.stringify({ scripts: { build: 'tsc && vite build', test: 'vitest run' } }),
  }))
  const filled: string[] = []
  on('prompt.fill', (_$, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })

  expect((await $.command.run(RUN)).text).toContain('Scripts pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 in package\.json/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /tsc && vite build/ })).toBeDefined()
    await ui.press({ key: 'script:test' })
    await ui.unmount()
  }

  expect(filled).toEqual(['Run npm run test and fix what fails', 'Run npm run test and fix what fails'])
})

test('says so when package.json cannot be read', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', () => ({ deny: 'no such file' }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No readable package\.json/ })).toBeDefined()
  await ui.unmount()
})

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

test('says so when package.json has no scripts, or is not JSON', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const file = { text: JSON.stringify({ name: 'app' }) }
  on('fs.read', () => ({ value: file.text }))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /package\.json has no scripts/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0 in package\.json/ })).toBeDefined()

  file.text = '{ broken'
  await $.command.run(RUN)
  expect(await ui.find({ type: 'Text', text: /No readable package\.json/ })).toBeDefined()
  await ui.unmount()
})

test('shows it is loading before the command ran', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Loading…/ })).toBeDefined()
  await ui.unmount()
})

test('refresh reads package.json again', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const file = { text: JSON.stringify({ scripts: { build: 'tsc' } }) }
  on('fs.read', () => ({ value: file.text }))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 in package\.json/ })).toBeDefined()

  file.text = JSON.stringify({ scripts: { build: 'tsc', lint: 'eslint .' } })
  await ui.press({ key: 'refresh' })
  expect(await ui.find({ type: 'Text', text: /2 in package\.json/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /eslint \./ })).toBeDefined()
  await ui.unmount()
})

test('speaks Portuguese when the hub is set to pt, but asks Claude in English', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', () => ({ value: JSON.stringify({ scripts: { test: 'vitest' } }) }))
  const filled: string[] = []
  on('prompt.fill', (_$, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })

  expect((await $.command.run(RUN)).text).toBe('Painel de scripts aberto.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 no package\.json/ })).toBeDefined()
  await ui.press({ key: 'script:test' })
  expect(filled).toEqual(['Run npm run test and fix what fails'])
  await ui.unmount()
})

test('registers /scripts with a Spanish description when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const registered: { name: string; description?: string }[] = []
  on('command.register', (_$, e) => {
    registered.push({ name: e.name, description: e.description })

    return { value: { command: e.name } }
  })

  await $.session.start(START)
  expect(registered).toEqual([{ name: 'scripts', description: 'Abre el panel con los scripts de package.json; pulsa uno para pedir a Claude que lo ejecute' }])
})
