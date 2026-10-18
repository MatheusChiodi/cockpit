import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'reply-outline',
  component: 'Pane',
  requestId: 'reply-outline',
  props: {
    title: 'Outline',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const ANSWER = [
  '## Cause',
  'The hook in src/auth/login.ts:42 reads the token early, see https://example.com/docs/hooks for details.',
  '```ts',
  '# not a heading',
  'import x from "other/file.ts"',
  '```',
  '### Fix',
  'Edit hooks.json and src/auth/login.ts again.',
].join('\n')

test('lists headings, files and links of the last reply, code left out, on terminal and desktop', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  await $.turn.complete({ answer: ANSWER, durationMs: 1000, isAborted: false, turnId: 'u1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    expect(await ui.find({ type: 'Text', text: /2 headings {2}2 files {2}1 links/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Cause/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /src\/auth\/login\.ts:42/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /https:\/\/example\.com\/docs\/hooks/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /not a heading|other\/file/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('explains itself before the first reply, in Portuguese on request', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Text', text: /Nenhuma resposta ainda/ })).toBeDefined()
  await ui.unmount()
})

test('opens its pane from /outline', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const ran = await $.command.run({
    command: 'outline',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  })

  expect(ran.text).toContain('Outline opened')
})

const complete = ($: any, answer: string, agentId?: string) =>
  $.turn.complete({ answer, durationMs: 1000, isAborted: false, turnId: 'u1', reason: 'answer', ...(agentId === undefined ? {} : { agentId }) })

const has = async (ui: any, text: RegExp) => (await ui.find({ type: 'Text', text })) !== undefined

test('says the last reply has nothing to outline', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  await complete($, 'Done. Version 1.2.3 is out, nothing else.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /no headings, file references or links/)).toBe(true)
  expect(await has(ui, /0 headings {2}0 files {2}0 links/)).toBe(true)
  await ui.unmount()
})

test('ignores replies of subagents and empty replies', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  await complete($, '## Main heading')
  await complete($, '## From agent', 'agent-1')
  await complete($, '')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /Main heading/)).toBe(true)
  expect(await has(ui, /From agent/)).toBe(false)
  await ui.unmount()
})

test('counts a file once with or without a line number, and caps each list at 12', async ($, on) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  const headings = Array.from({ length: 15 }, (_, i) => `# Step ${i + 1}`)
  await complete($, [...headings, 'See app.ts:10 and app.ts and ../outside.ts'].join('\n'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /12 headings {2}1 files {2}0 links/)).toBe(true)
  expect(await has(ui, /Step 12$/)).toBe(true)
  expect(await has(ui, /Step 13/)).toBe(false)
  expect(await has(ui, /outside/)).toBe(false)
  await ui.unmount()
})

test('speaks Spanish in the pane and the command', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await complete($, 'Read https://example.com/a')

  const ran = await $.command.run({
    command: 'outline',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  })
  expect(ran.text).toContain('Estructura abierta')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await has(ui, /0 títulos {2}0 archivos {2}1 enlaces/)).toBe(true)
  await ui.unmount()
})
