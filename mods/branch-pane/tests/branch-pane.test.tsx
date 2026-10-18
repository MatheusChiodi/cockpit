import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'branch-pane',
  component: 'Pane',
  requestId: 'branch-pane',
  props: {
    title: 'Branches',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'branches',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

test('lists local branches with the current one marked, tracking and age', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: [
        `*\tfeat/login\torigin/feat/login\tahead 2\t${10_000 - 7200}`,
        `\tmain\torigin/main\tbehind 3\t${10_000 - 4 * 86400}`,
        `\tfix/typo\t\t\t${10_000 - 3 * 604800}`,
        '',
      ].join('\n'),
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))

  expect((await $.command.run(RUN)).text).toContain('Branches pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /3 local/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /●/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↑2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /↓3/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /no upstream/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /3w/ })).toBeDefined()
    await ui.unmount()
  }
})

const ran = (exitCode: number, stdout = '') => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

test('says so when the folder is not a git repository', async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ran(128))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /Not a git repository/)).toBe(true)
  expect(await has(ui, /local/)).toBe(false)
  await ui.unmount()
})

test('says so when the repository has no local branches', async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ran(0, ''))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /No local branches/)).toBe(true)
  expect(await has(ui, /0 local/)).toBe(true)
  await ui.unmount()
})

test('marks a branch whose upstream is gone', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ran(0, `\told\torigin/old\tgone\t${1000 - 30}\n`))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /upstream gone/)).toBe(true)
  expect(await has(ui, /30s/)).toBe(true)
  await ui.unmount()
})

test('refresh reloads the branches', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  const lines = [`*\tmain\torigin/main\t\t${1000 - 60}\n`]
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ran(0, lines.join('')))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /1 local/)).toBe(true)

  lines.push(`\tfeat/new\t\t\t${1000 - 120}\n`)
  await ui.press({ key: 'refresh' })
  expect(await has(ui, /2 local/)).toBe(true)
  expect(await has(ui, /feat\/new/)).toBe(true)
  await ui.unmount()
})

test('speaks Portuguese and Spanish when the hub says so', async ($, on) => {
  mock.clock(on)
  let lang = 'pt'
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ran(128))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.command.run(RUN)).text).toContain('Painel de branches aberto')
  const pt = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(pt, /Não é um repositório git/)).toBe(true)
  await pt.unmount()

  lang = 'es'
  expect((await $.command.run(RUN)).text).toContain('Panel de ramas abierto')
  const es = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(es, /No es un repositorio git/)).toBe(true)
  await es.unmount()
})
