import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'code-todo-pane',
  component: 'Pane',
  requestId: 'code-todo-pane',
  props: {
    title: 'Code TODO',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'codetodo',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const answer = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('groups the tagged lines by tag with file and line', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () =>
    answer(
      0,
      [
        'src/auth/login.ts:12:  // TODO: validate email',
        'src/api/client.ts:41:  // FIXME retry on 429',
        'src/api/client.ts:90:  // TODO cache this',
        'src/ui/pane.tsx:7:  // HACK: width guess',
        '',
      ].join('\n'),
    ),
  )

  expect((await $.command.run(RUN)).text).toContain('Code TODO pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /4 found/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /src\/auth\/login\.ts:12/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /src\/api\/client\.ts:41/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /src\/ui\/pane\.tsx:7/ })).toBeDefined()
    await ui.unmount()
  }
})

test('caps the list at 60 and says how many exist', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(0, Array.from({ length: 75 }, (_, i) => `f${i}.ts:${i + 1}:// TODO ${i}`).join('\n')))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /75 found · first 60/ })).toBeDefined()
  await ui.unmount()
})

test('treats exit 1 as no match', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => answer(1, ''))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No TODO, FIXME or HACK/ })).toBeDefined()
  await ui.unmount()
})
