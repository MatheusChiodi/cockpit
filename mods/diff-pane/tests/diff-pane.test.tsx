import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'diff-pane',
  component: 'Pane',
  requestId: 'diff-pane',
  props: {
    title: 'Edits',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('lists edits and writes with lines added and removed, and a running total', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: {} as never }))
  on('tool.call', { tool: 'Write' }, () => ({ result: {} as never }))

  await $.tool.call({
    tool: 'Edit',
    tool_use_id: 'e1',
    file_path: 'src/app.ts',
    old_string: 'a\nb',
    new_string: 'a\nb\nc\nd\ne',
  })
  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: 'src/new.ts', content: '1\n2\n3\n4' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 edits  \+9 −2/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /src\/new\.ts/ })).toBeDefined()
    await ui.unmount()
  }
})

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

test('explains itself before the first edit', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /No edits yet/)).toBe(true)
  expect(await has(ui, /0 edits {2}\+0 −0/)).toBe(true)
  await ui.unmount()
})

test('leaves denied and failed calls out', async ($, on) => {
  let answer: any = { deny: 'blocked' }
  on('tool.call', { tool: 'Edit' }, () => answer)
  on('tool.call', { tool: 'Write' }, () => answer)

  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: 'denied.ts', content: 'x' })
  answer = { result: {} as never, isError: true }
  await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: 'failed.ts', old_string: 'a', new_string: 'b' })
  answer = { result: {} as never }
  await $.tool.call({ tool: 'Write', tool_use_id: 'w2', file_path: 'kept.ts', content: '' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /1 edits {2}\+0 −0/)).toBe(true)
  expect(await has(ui, /kept\.ts/)).toBe(true)
  expect(await has(ui, /denied|failed/)).toBe(false)
  await ui.unmount()
})

test('shortens a long path from the left to fit the pane', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ({ result: {} as never }))
  const path = `${'deep/'.repeat(20)}target.ts`
  await $.tool.call({ tool: 'Write', tool_use_id: 'w1', file_path: path, content: 'x' })

  const ui = await $.ui.mount({ ...PANE, props: { ...PANE.props, bodyColumns: 40 }, surface: 'terminal' })
  expect(await has(ui, /….*deep\/target\.ts/)).toBe(true)
  expect(await has(ui, /^deep\//)).toBe(false)
  await ui.unmount()
})

test('opens from /edits and speaks Portuguese and Spanish', async ($, on) => {
  let lang = 'pt'
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  const run = { command: 'edits', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } } as const

  expect((await $.command.run(run)).text).toContain('Painel de edições aberto')
  const pt = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(pt, /Nenhuma edição ainda/)).toBe(true)
  await pt.unmount()

  lang = 'es'
  expect((await $.command.run(run)).text).toContain('Panel de ediciones abierto')
  const es = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(es, /Aún no hay ediciones/)).toBe(true)
  await es.unmount()
})
