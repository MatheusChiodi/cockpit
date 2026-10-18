import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'deps-pane',
  component: 'Pane',
  requestId: 'deps-pane',
  props: {
    title: 'Deps',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'deps',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const OUTDATED = {
  react: { current: '18.3.1', wanted: '18.3.1', latest: '19.1.0' },
  vite: { current: '5.2.0', wanted: '5.4.8', latest: '5.5.0' },
  typescript: { current: '5.4.2', wanted: '5.4.5', latest: '5.4.5' },
}

test('runs npm outdated through cmd on Windows and draws the table, majors first', async ($, on) => {
  mock.env(on, { OS: 'Windows_NT' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const argvs: (readonly string[])[] = []
  on('process.run', (_$, e) => {
    argvs.push(e.argv)

    return {
      value: {
        exitCode: 1,
        stdout: JSON.stringify(OUTDATED),
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })

  expect((await $.command.run(RUN)).text).toContain('Deps pane opened')
  expect(argvs[0]).toEqual(['cmd', '/c', 'npm', 'outdated', '--json'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /3 outdated · 1 major/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /react {2,}18\.3\.1 {2,}18\.3\.1 {2,}19\.1\.0/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /vite/ })).toBeDefined()
    await ui.unmount()
  }
})

test('says everything is up to date on an empty answer', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ({
    value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Everything is up to date/ })).toBeDefined()
  await ui.unmount()
})

test('reports a failure when npm answers something that is not JSON', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ({
    value: { exitCode: 1, stdout: 'npm ERR! no package.json', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /npm outdated failed/ })).toBeDefined()
  await ui.unmount()
})

const answer = (stdout: string) => ({
  value: { exitCode: 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('runs npm directly outside Windows', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const argvs: (readonly string[])[] = []
  on('process.run', (_$, e) => {
    argvs.push(e.argv)

    return answer('{}')
  })

  await $.command.run(RUN)
  expect(argvs[0]).toEqual(['npm', 'outdated', '--json'])
})

test('shows loading before the first run', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Loading…/ })).toBeDefined()
  await ui.unmount()
})

test('a JSON array counts as a failure', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer('[1, 2]'))

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /npm outdated failed/ })).toBeDefined()
  await ui.unmount()
})

test('registers the command and speaks Portuguese from the hub', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const described: string[] = []
  on('command.register', (_$, e) => {
    described.push(e.description ?? '')

    return { value: { command: e.name } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(JSON.stringify(OUTDATED)))

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  expect(described[0]).toContain('pacotes npm desatualizados')
  expect((await $.command.run(RUN)).text).toBe('Painel de dependências aberto.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /3 desatualizados · 1 major/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /pacote/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish from the hub', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(''))

  expect((await $.command.run(RUN)).text).toBe('Panel de dependencias abierto.')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Todo está actualizado/ })).toBeDefined()
  await ui.unmount()
})

test('the refresh button runs npm outdated again', async ($, on) => {
  mock.env(on, { OS: 'Linux' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  let runs = 0
  on('process.run', () => {
    runs += 1

    return answer(runs === 1 ? '' : JSON.stringify(OUTDATED))
  })

  await $.command.run(RUN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'refresh' })
  expect(runs).toBe(2)
  expect(await ui.find({ type: 'Text', text: /3 outdated/ })).toBeDefined()
  await ui.unmount()
})
