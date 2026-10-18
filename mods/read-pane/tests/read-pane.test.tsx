import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'read-pane',
  component: 'Pane',
  requestId: 'read-pane',
  props: {
    title: 'Reads',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('counts reads per file and flags files read 3 or more times', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never }))

  const read = (file_path: string, id: string) => $.tool.call({ tool: 'Read', file_path, tool_use_id: id })

  await read('src/loop.ts', 'r1')
  await read('src/loop.ts', 'r2')
  await read('src/loop.ts', 'r3')
  await read('README.md', 'r4')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 files  1 read 3\+ times/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /3×/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /wasted context/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /README\.md/ })).toBeDefined()
    await ui.unmount()
  }
})

const RUN = { command: 'reads', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } } as const

test('shows the empty message before any read', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No file read yet/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0 files  0 read 3\+ times/ })).toBeDefined()
  await ui.unmount()
})

test('does not count denied or failed reads', async ($, on) => {
  let answer: any = { deny: 'no' }
  on('tool.call', { tool: 'Read' }, () => answer)

  await $.tool.call({ tool: 'Read', file_path: 'a.ts', tool_use_id: 'r1' })
  answer = { result: {} as never, isError: true }
  await $.tool.call({ tool: 'Read', file_path: 'b.ts', tool_use_id: 'r2' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /No file read yet/ })).toBeDefined()
  await ui.unmount()
})

test('two reads are not flagged and long paths are shortened from the left', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never }))
  const long = `/repo/${'deep/'.repeat(30)}target.ts`

  await $.tool.call({ tool: 'Read', file_path: long, tool_use_id: 'r1' })
  await $.tool.call({ tool: 'Read', file_path: long, tool_use_id: 'r2' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /2×/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /wasted context/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /….*deep\/target\.ts/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\/repo\// })).toBeUndefined()
  await ui.unmount()
})

test('registers /reads and opens the pane, in Portuguese from the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const registered: string[] = []
  on('command.register', (_$, e) => {
    registered.push(e.name)

    return { value: { command: e.name } }
  })
  const titles: string[] = []
  on('ui.open', (_$, e) => {
    titles.push(String(e.title))

    return { value: { isPlaced: true } }
  })
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never }))

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  expect(registered).toEqual(['reads'])
  expect((await $.command.run(RUN)).text).toBe('Painel de leituras aberto.')
  expect(titles).toEqual(['Leituras'])

  for (const id of ['r1', 'r2', 'r3']) {
    await $.tool.call({ tool: 'Read', file_path: 'a.ts', tool_use_id: id })
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 arquivos  1 lidos 3\+ vezes/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /contexto desperdiçado/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish from the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  expect((await $.command.run(RUN)).text).toBe('Panel de lecturas abierto.')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Ningún archivo leído aún/ })).toBeDefined()
  await ui.unmount()
})
