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
