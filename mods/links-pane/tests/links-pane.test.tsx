import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'links-pane',
  component: 'Pane',
  requestId: 'links-pane',
  props: {
    title: 'Links',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

test('collects the URLs of the answers, newest first, and pressing one copies it', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  let copied = ''
  on('ui.copy', (_$, e) => {
    copied = e.text

    return { value: { isCopied: true } }
  })

  const done = (answer: string, turnId: string) => ({ answer, durationMs: 1, isAborted: false, turnId, reason: 'answer' as const })

  await $.turn.complete(done('See https://docs.example.com/api/auth. Also (https://example.com/a).', 't1'))
  await $.turn.complete(done('Fixed in https://github.com/acme/app/pull/42, again https://example.com/a', 't2'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /3 urls/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /https:\/\/docs\.example\.com\/api\/auth$/ })).toBeDefined()
    await ui.press({ key: 'link:https://github.com/acme/app/pull/42' })
    expect(copied).toBe('https://github.com/acme/app/pull/42')
    await ui.unmount()
  }
})

const RUN = {
  command: 'links',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const turn = (answer: string, turnId: string, agentId?: string) => ({
  answer,
  durationMs: 1,
  isAborted: false,
  turnId,
  reason: 'answer' as const,
  ...(agentId === undefined ? {} : { agentId }),
})

test('explains itself while no URL was collected', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /0 urls/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /No URL yet/ })).toBeDefined()
  await ui.unmount()
})

test('ignores subagent answers and too short URLs, and strips trailing punctuation', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  await $.turn.complete(turn('Sub found https://sub.example.com/x', 't1', 'a1'))
  await $.turn.complete(turn('Short http://a and real https://example.org/page!?', 't2'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 urls/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^https:\/\/example\.org\/page$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /sub\.example\.com/ })).toBeUndefined()
  await ui.unmount()
})

test('keeps only the last 100 URLs', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))

  const urls = Array.from({ length: 105 }, (_, at) => `https://example.com/p/${at}`)
  await $.turn.complete(turn(urls.join(' '), 't1'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /100 urls/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\/p\/104$/ })).toBeDefined()
  await ui.unmount()
})

test('opens the pane in the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  const titles: string[] = []
  on('ui.open', (_$, e) => {
    titles.push(e.title ?? '')

    return { value: { isPlaced: true } }
  })

  expect((await $.command.run(RUN)).text).toBe('Painel de links aberto.')
  expect(titles).toEqual(['Links'])

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Nenhuma URL ainda/ })).toBeDefined()
  await ui.unmount()
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  const titles: string[] = []
  on('ui.open', (_$, e) => {
    titles.push(e.title ?? '')

    return { value: { isPlaced: true } }
  })

  expect((await $.command.run(RUN)).text).toBe('Panel de enlaces abierto.')
  expect(titles).toEqual(['Enlaces'])
})
