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
