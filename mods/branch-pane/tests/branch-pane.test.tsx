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
