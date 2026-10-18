import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'git-pane',
  component: 'Pane',
  requestId: 'git-pane',
  props: {
    title: 'Repo',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const ok = (stdout: string) => ({
  value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('reads branch, changes and commits when the command runs, and draws them', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', (_$, e) =>
    e.argv.includes('status')
      ? ok('## feat/login...origin/feat/login [ahead 2, behind 1]\n M src/a.ts\nA  src/b.ts\n?? notes.txt\n')
      : ok(`a1b2c3d\t${10_000 - 7200}\tAdd login form\n`),
  )

  const ran = await $.command.run({
    command: 'repo',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  })
  expect(ran.text).toContain('Repo pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /⎇ feat\/login {2}↑2 ↓1 {2}3 changed/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /src\/a\.ts/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Add login form/ })).toBeDefined()
    await ui.unmount()
  }
})

test('says so when the folder is not a repository', async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ({
    value: { exitCode: 128, stdout: '', stderr: 'fatal', isStdoutTruncated: false, isStderrTruncated: false },
  }))

  await $.command.run({
    command: 'repo',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Not a git repository/ })).toBeDefined()
  await ui.unmount()
})

const RUN = {
  command: 'repo',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

test('shows Loading before the command has read the repository', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Loading…/ })).toBeDefined()
  await ui.unmount()
})

test('says the tree is clean and there are no commits on a fresh repository', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', (_$, e) => (e.argv.includes('status') ? ok('## No commits yet on main\n') : ok('')))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /⎇ main {2}↑0 ↓0 {2}0 changed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Working tree clean/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No commits yet\./ })).toBeDefined()
  await ui.unmount()
})

test('formats commit ages in weeks, days and seconds', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', (_$, e) =>
    e.argv.includes('status')
      ? ok('## main\n')
      : ok(`aaaaaaa\t${10_000 - 3 * 604800}\tOld one\nbbbbbbb\t${10_000 - 2 * 86400}\tDays ago\nccccccc\t${10_000 - 5}\tJust now\n`),
  )

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Old one 3w/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Days ago 2d/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Just now 5s/ })).toBeDefined()
  await ui.unmount()
})

test('the refresh button reads the repository again', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  let changes = ''
  on('process.run', (_$, e) => (e.argv.includes('status') ? ok(`## main\n${changes}`) : ok('')))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 changed/ })).toBeDefined()
  changes = ' D gone.ts\n'
  await ui.press({ key: 'refresh' })
  expect(await ui.find({ type: 'Text', text: /1 changed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /gone\.ts/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Portuguese and Spanish when the hub says so', async ($, on) => {
  mock.clock(on, { now: 10_000_000 })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', (_$, e) => (e.argv.includes('status') ? ok('## main\n M a.ts\n') : ok('')))
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  const pt = await $.command.run(RUN)
  expect(pt.text).toContain('Painel do repositório aberto.')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 alterados/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Ainda sem commits/ })).toBeDefined()
  await ui.unmount()

  lang = 'es'
  const es = await $.command.run(RUN)
  expect(es.text).toContain('Panel del repositorio abierto.')
  const again = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await again.find({ type: 'Text', text: /1 cambiados/ })).toBeDefined()
  expect(await again.find({ type: 'Text', text: /Aún sin commits/ })).toBeDefined()
  await again.unmount()
})
