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
