import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'scripts-pane',
  component: 'Pane',
  requestId: 'scripts-pane',
  props: {
    title: 'Scripts',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const RUN = {
  command: 'scripts',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

test('lists the scripts and puts the chosen one in the prompt box', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', () => ({
    value: JSON.stringify({ scripts: { build: 'tsc && vite build', test: 'vitest run' } }),
  }))
  const filled: string[] = []
  on('prompt.fill', (_$, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })

  expect((await $.command.run(RUN)).text).toContain('Scripts pane opened')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 in package\.json/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /tsc && vite build/ })).toBeDefined()
    await ui.press({ key: 'script:test' })
    await ui.unmount()
  }

  expect(filled).toEqual(['Run npm run test and fix what fails', 'Run npm run test and fix what fails'])
})

test('says so when package.json cannot be read', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', () => ({ deny: 'no such file' }))

  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No readable package\.json/ })).toBeDefined()
  await ui.unmount()
})
