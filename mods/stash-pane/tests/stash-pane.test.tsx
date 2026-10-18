import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'stash-pane',
  component: 'Pane',
  requestId: 'stash-pane',
  props: {
    title: 'Stashes',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'stashes',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const answer = (stdout: string) => ({
  value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('lists stashes with index, branch, message and age', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () =>
    answer(
      [
        `stash@{0}\t${10_000 - 3 * 3600}\tWIP on feat/login: a1b2c3d add form`,
        `stash@{1}\t${10_000 - 6 * 86400}\tOn main: try new cache`,
        '',
      ].join('\n'),
    ),
  )

  expect((await $.command.run(RUN)).text).toContain('Stashes pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 saved/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /a1b2c3d add form/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /try new cache/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /6d/ })).toBeDefined()
    await ui.unmount()
  }
})

test('shows the empty state when there are no stashes', async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(''))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No stashes/ })).toBeDefined()
  await ui.unmount()
})

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

test('says so outside a git repository', async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ({ value: { exitCode: 128, stdout: '', stderr: 'fatal', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /Not a git repository/)).toBe(true)
  expect(await has(ui, /saved/)).toBe(false)
  await ui.unmount()
})

test('shows Loading before the list was read', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /Loading…/)).toBe(true)
  await ui.unmount()
})

test('keeps a subject that is not in the usual shape', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(`stash@{3}\t${1000 - 90}\tsomething odd\n`))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /something odd/)).toBe(true)
  expect(await has(ui, / 3/)).toBe(true)
  expect(await has(ui, /1m/)).toBe(true)
  await ui.unmount()
})

test('refresh reads the list again', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let stdout = ''
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(stdout))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /No stashes/)).toBe(true)

  stdout = `stash@{0}\t${1000 - 10}\tOn main: quick save\n`
  await ui.press({ key: 'refresh' })
  expect(await has(ui, /1 saved/)).toBe(true)
  expect(await has(ui, /quick save/)).toBe(true)
  await ui.unmount()
})

test('speaks Portuguese and Spanish when the hub says so', async ($, on) => {
  mock.clock(on)
  let lang = 'pt'
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(''))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.command.run(RUN)).text).toContain('Painel de stashes aberto')
  const pt = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(pt, /Nenhum stash/)).toBe(true)
  await pt.unmount()

  lang = 'es'
  expect((await $.command.run(RUN)).text).toContain('Panel de stashes abierto')
  const es = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(es, /Ningún stash/)).toBe(true)
  await es.unmount()
})
