import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'error-pane',
  component: 'Pane',
  requestId: 'error-pane',
  props: {
    title: 'Errors',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('lists failed and denied calls with a short input and the first line of the error', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command === 'ls'
      ? { result: { stdout: 'ok', stderr: '', interrupted: false } }
      : { deny: 'blocked by a guard\nsecond line' },
  )
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never, text: '\nfile not found: a.ts\nmore', isError: true }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'ok' })
  await $.tool.call({ tool: 'Bash', command: 'rm -rf build', tool_use_id: 'no' })
  await $.tool.call({ tool: 'Read', file_path: 'a.ts', tool_use_id: 'bad' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 failed or denied/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /rm -rf build/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /blocked by a guard/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /file not found: a\.ts/ })).toBeDefined()
    await ui.unmount()
  }
})

test('says the pane is empty before anything fails', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'ok', stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'ok' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 failed or denied/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No failed tool call yet/ })).toBeDefined()
  await ui.unmount()
})

test('shows no message for an error with an empty text', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: {} as never, text: '```\n\n', isError: true }))

  await $.tool.call({ tool: 'Read', file_path: 'b.ts', tool_use_id: 'r' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /no message/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /b\.ts/ })).toBeDefined()
  await ui.unmount()
})

test('shows the newest failure first and collapses whitespace in the input', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, (_$, e) => ({ deny: `denied ${e.tool_use_id}` }))

  await $.tool.call({ tool: 'Bash', command: 'first   one', tool_use_id: 'a' })
  await $.tool.call({ tool: 'Bash', command: 'second\n\tone', tool_use_id: 'b' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const texts = JSON.stringify(await ui.drawn())
  expect(texts.indexOf('denied b')).toBeLessThan(texts.indexOf('denied a'))
  expect(await ui.find({ type: 'Text', text: /second one/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /first one/ })).toBeDefined()
  await ui.unmount()
})

test('opens the pane and speaks the language set in the hub', async ($, on) => {
  let lang = 'pt'
  const opened: string[] = []
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.open', (_$, e) => {
    opened.push(e.title ?? '')

    return { value: { isPlaced: true } }
  })

  const run = { command: 'errors', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } } as const

  expect((await $.command.run(run)).text).toBe('Painel de erros aberto.')
  const pt = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await pt.find({ type: 'Text', text: /Nenhuma chamada falhou ainda/ })).toBeDefined()
  await pt.unmount()

  lang = 'es'
  expect((await $.command.run(run)).text).toBe('Panel de errores abierto.')
  const es = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await es.find({ type: 'Text', text: /0 con fallo o denegadas/ })).toBeDefined()
  await es.unmount()
  expect(opened).toEqual(['Erros', 'Errores'])
})
