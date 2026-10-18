import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'prompt-history',
  component: 'Pane',
  requestId: 'prompt-history',
  props: {
    title: 'Prompts',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('lists typed prompts newest first and pressing one puts it back in the box', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  let filled = ''
  on('prompt.fill', (_$, e) => {
    filled = e.text

    return { isFilled: true }
  })

  await $.prompt.submit({ text: 'fix the login hook', wait: false, origin: { kind: 'composer' } })
  await $.prompt.submit({ text: 'add a test for it', wait: false, origin: { kind: 'composer' } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 typed/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /add a test for it/ })).toBeDefined()
    await ui.press({ key: 'prompt:1' })
    expect(filled).toBe('fix the login hook')
    await ui.unmount()
  }
})

const RUN = {
  command: 'prompts',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const submit = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const

test('opens the pane and shows the empty hint before any prompt', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))

  expect((await $.command.run(RUN)).text).toBe('Prompts pane opened.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 typed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No prompt yet/ })).toBeDefined()
  await ui.unmount()
})

test('skips blank prompts and slash commands, and keeps a repeated prompt once at the top', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  let filled = ''
  on('prompt.fill', (_$, e) => {
    filled = e.text

    return { isFilled: true }
  })

  await $.prompt.submit(submit('first'))
  await $.prompt.submit(submit('   '))
  await $.prompt.submit(submit('/clear'))
  await $.prompt.submit(submit('second'))
  await $.prompt.submit(submit('  first  '))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /2 typed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\/clear/ })).toBeUndefined()
  await ui.press({ key: 'prompt:0' })
  expect(filled).toBe('first')
  await ui.unmount()
})

test('folds whitespace of a multi-line prompt in its row but fills it whole', async ($, on) => {
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  let filled = ''
  on('prompt.fill', (_$, e) => {
    filled = e.text

    return { isFilled: true }
  })

  await $.prompt.submit(submit('line one\n\nline   two'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /line one line two/ })).toBeDefined()
  await ui.press({ key: 'prompt:0' })
  expect(filled).toBe('line one\n\nline   two')
  await ui.unmount()
})

test('speaks Portuguese and Spanish when the hub says so', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.command.run(RUN)).text).toBe('Painel de prompts aberto.')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0 digitados/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Nenhum prompt ainda/ })).toBeDefined()
  await ui.unmount()

  lang = 'es'
  expect((await $.command.run(RUN)).text).toBe('Panel de prompts abierto.')
  const again = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await again.find({ type: 'Text', text: /0 escritos/ })).toBeDefined()
  expect(await again.find({ type: 'Text', text: /Aún no hay prompts/ })).toBeDefined()
  await again.unmount()
})
