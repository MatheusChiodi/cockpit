import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const BAND = {
  plugin: 'turn-timer',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

const complete = (patch: Record<string, unknown> = {}) =>
  ({
    text: 'ok',
    reason: 'answer',
    answer: 'ok',
    durationMs: 12400,
    isAborted: false,
    turnId: 't1',
    usage: { input_tokens: 1, output_tokens: 1500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' },
    ...patch,
  }) as never

// The world beneath the mod: an empty band and the tools answering.
const world = (on: On) => {
  on('turn.complete', () => ({ text: 'ok' }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

test('draws the last turn: seconds, tools and tokens', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'a' })
  await $.tool.call({ tool: 'Bash', command: 'pwd', tool_use_id: 'b' })
  await $.turn.complete(complete())

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Text', text: /12s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /2 tools {2}1\.5k tokens/ })).toBeDefined()
    await ui.unmount()
  }
})

test('marks an interrupted turn and ignores subagent turns', async ($, on) => {
  world(on)
  await $.turn.complete(complete({ isAborted: true, reason: 'aborted', durationMs: 3000, usage: undefined }))
  await $.turn.complete(complete({ agentId: 'sub', durationMs: 99000 }))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /3s/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /0 tools {2}0 tokens {2}interrupted/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /99s/ })).toBeUndefined()
  await ui.unmount()
})

test('draws nothing before the first turn, and the button hides it', async ($, on) => {
  world(on)

  const empty = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await empty.find({ key: 'hide' })).toBeUndefined()
  await empty.unmount()

  await $.turn.complete(complete())
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'hide' })).toBeDefined()
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Text', text: /12s/ })).toBeUndefined()
  await ui.unmount()
})

test('yields to a survey', async ($, on) => {
  world(on)
  await $.turn.complete(complete())

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /12s/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks the language set in the hub', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  await $.turn.complete(complete({ isAborted: true, reason: 'aborted' }))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /interrompido/ })).toBeDefined()
  expect(await ui.find({ key: 'hide', text: /Ocultar/ })).toBeDefined()
  await ui.unmount()
})

test('counts tools from the start of the turn only', async ($, on) => {
  world(on)
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'a' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b' })
  await $.turn.start({ text: 'go', turnId: 't2' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'c' })
  await $.turn.complete(complete())

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 tools/ })).toBeDefined()
  await ui.unmount()
})

test('leaves subagent tool calls out of the count', async ($, on) => {
  world(on)
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'a', ...{ agentId: 'sub' } })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'b' })
  await $.turn.complete(complete())

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /1 tools/ })).toBeDefined()
  await ui.unmount()
})

test('shows small token counts as is and rounds the seconds', async ($, on) => {
  world(on)
  await $.turn.complete(
    complete({ durationMs: 1600, usage: { input_tokens: 1, output_tokens: 999, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' } }),
  )

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /2s/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /999 tokens/ })).toBeDefined()
  await ui.unmount()
})

test('replaces the band with the newest turn', async ($, on) => {
  world(on)
  await $.turn.complete(complete())
  await $.turn.complete(complete({ durationMs: 45000 }))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /45s/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /12s/ })).toBeUndefined()
  await ui.unmount()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.turn.complete(complete({ isAborted: true, reason: 'aborted' }))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /TURNO/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /interrumpido/ })).toBeDefined()
  await ui.unmount()
})
