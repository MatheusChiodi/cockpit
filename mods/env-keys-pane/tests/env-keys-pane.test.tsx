import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'env-keys-pane',
  component: 'Pane',
  requestId: 'env-keys-pane',
  props: {
    title: 'Env keys',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'envkeys',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

// Built at run time so no file holds a secret-looking string.
const SECRET = `sk_live_${'a1B2'.repeat(6)}`

test('lists missing and extra keys and never draws a value', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', (_$, e) => ({
    value: e.path.endsWith('.env.example')
      ? '# keys\nAPI_URL=\nSTRIPE_KEY=\nexport DATABASE_URL=\n'
      : `API_URL=https://x.test\nDEBUG_SQL=1\nSTRIPE_TOKEN=${SECRET}\n`,
  }))

  expect((await $.command.run(RUN)).text).toContain('Env keys pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 missing · 2 extra/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /STRIPE_KEY/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /DATABASE_URL/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /DEBUG_SQL/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /STRIPE_TOKEN/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: new RegExp(SECRET) })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /https:\/\/x\.test/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('reports every key missing when .env cannot be read', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', (_$, e) => (e.path.endsWith('.env.example') ? { value: 'A=\nB=\n' } : { deny: 'no such file' }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No readable \.env:/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /2 missing · 0 extra/ })).toBeDefined()
  await ui.unmount()
})

test('says loading before the pane was ever filled', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Loading…/ })).toBeDefined()
  await ui.unmount()
})

test('says there is no .env.example when it cannot be read', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', (_$, e) => (e.path.endsWith('.env.example') ? { deny: 'no such file' } : { value: 'A=1\n' }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No readable \.env\.example here\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /missing ·/ })).toBeUndefined()
  await ui.unmount()
})

test('shows the files in sync and counts a repeated key once', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', (_$, e) => ({
    value: e.path.endsWith('.env.example') ? 'A=\nB=\nA=\n# C=\n' : 'export A=1\n  B = 2\n',
  }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /\.env has every key of \.env\.example\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0 missing · 0 extra/ })).toBeDefined()
  await ui.unmount()
})

test('refresh reads the files again', async ($, on) => {
  const files = { env: 'A=1\n' }
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', (_$, e) => ({ value: e.path.endsWith('.env.example') ? 'A=\nB=\n' : files.env }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 missing · 0 extra/ })).toBeDefined()

  files.env = 'A=1\nB=2\n'
  await $.ui.press({ plugin: 'env-keys-pane', key: 'refresh' })
  expect(await ui.find({ type: 'Text', text: /0 missing · 0 extra/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Portuguese and Spanish when the hub says so', async ($, on) => {
  const hub = { lang: 'pt' as 'pt' | 'es' }
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: hub.lang, version: 1 } }))
  on('fs.read', (_$, e) => ({ value: e.path.endsWith('.env.example') ? 'A=\nB=\n' : 'A=1\nZ=2\n' }))

  expect((await $.command.run(RUN)).text).toBe('Painel de chaves do env aberto.')
  const pt = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pt.find({ type: 'Text', text: /1 faltando · 1 extras/ })).toBeDefined()
  expect(await pt.find({ type: 'Text', text: /fora do \.env\.example/ })).toBeDefined()
  await pt.unmount()

  hub.lang = 'es'
  expect((await $.command.run(RUN)).text).toBe('Panel de claves del env abierto.')
  const es = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await es.find({ type: 'Text', text: /1 faltan · 1 extras/ })).toBeDefined()
  await es.unmount()
})
