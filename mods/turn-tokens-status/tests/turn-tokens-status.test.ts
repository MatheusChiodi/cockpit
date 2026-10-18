import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't-1', reason: 'answer' } as const

const STEP = { turnId: 't-1', index: 0, model: 'm', messageCount: 1 } as const

const usage = (output: number) => ({
  input_tokens: 1,
  output_tokens: output,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  model: 'm',
})

// The world beneath the mod: a model that writes 800 characters, then stops having used `output` tokens.
const world = (on: On, output = 250) => {
  const status: (string | undefined)[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('turn.step', async function* (_$, e) {
    yield { kind: 'text', index: 0, text: 'x'.repeat(800), ref: 1 } as never
    yield { kind: 'stop', stopReason: 'end_turn', usage: usage(output), ref: 2 } as never

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: usage(output) } as never
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

const step = async ($: { turn: { step: (e: typeof STEP & { agentId?: string }) => AsyncIterable<unknown> } }, agentId?: string) => {
  for await (const chunk of $.turn.step(agentId === undefined ? STEP : { ...STEP, agentId })) {
    void chunk
  }
}

test('grows with the model output, estimated while streaming and exact at the stop', async ($, on) => {
  const status = world(on)
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)

  expect(status).toContain('out ~200 tokens')
  expect(status.at(-1)).toBe('out 250 tokens')

  await step($ as never)
  expect(status.at(-1)).toBe('out 500 tokens')
})

test('clears when the turn ends and ignores subagent steps', async ($, on) => {
  const status = world(on, 1500)
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never, 'sub')
  expect(status.every(text => text === undefined)).toBe(true)

  await step($ as never)
  expect(status.at(-1)).toBe('out 1.5k tokens')

  await $.turn.complete(TURN)
  expect(status.at(-1)).toBeUndefined()
})

test('shows nothing while the hub lists it as off', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'off' }, () => ({ value: { value: ['turn-tokens-status'], version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)

  expect(status.every(text => text === undefined)).toBe(true)
})

test('speaks the language set in the hub', async ($, on) => {
  const status = world(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)

  expect(status.at(-1)).toBe('salida 250 tokens')
})

// A model that streams the given chunks and stops; `output` undefined stops with a null usage.
const streaming = (on: On, chunks: object[], output?: number) => {
  const status: (string | undefined)[] = []
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('turn.step', async function* (_$, e) {
    for (const chunk of chunks) {
      yield chunk as never
    }

    yield { kind: 'stop', stopReason: 'end_turn', usage: output === undefined ? null : usage(output), ref: 9 } as never

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: usage(output ?? 0) } as never
  })
  on('ui.status', (_$, e) => {
    status.push(e.text)

    return { value: undefined }
  })

  return status
}

test('keeps the estimate when the stop carries no usage', async ($, on) => {
  const status = streaming(on, [{ kind: 'text', index: 0, text: 'x'.repeat(400), ref: 1 }])
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)

  expect(status).toContain('out ~100 tokens')
  expect(status.at(-1)).toBe('out 100 tokens')
})

test('counts thinking and tool input along with text', async ($, on) => {
  const status = streaming(on, [
    { kind: 'thinking', index: 0, text: 'x'.repeat(200), ref: 1 },
    { kind: 'input', index: 1, json: 'y'.repeat(200), ref: 2 },
  ])
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)

  expect(status).toContain('out ~50 tokens')
  expect(status).toContain('out ~100 tokens')
})

test('a subagent finishing does not clear the main count', async ($, on) => {
  const status = world(on)
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)
  expect(status.at(-1)).toBe('out 250 tokens')

  await $.turn.complete({ ...TURN, agentId: 'sub' })
  expect(status.at(-1)).toBe('out 250 tokens')
})

test('a new turn starts the count over', async ($, on) => {
  const status = world(on)
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)
  await $.turn.start({ text: 'again', turnId: 't-2' })
  expect(status.at(-1)).toBeUndefined()

  await step($ as never)
  expect(status.at(-1)).toBe('out 250 tokens')
})

test('does not write the same rounded text twice', async ($, on) => {
  const status = streaming(on, [
    { kind: 'text', index: 0, text: 'x'.repeat(40), ref: 1 },
    { kind: 'text', index: 0, text: 'x', ref: 2 },
  ], 10)
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)

  expect(status.filter(text => text === 'out ~10 tokens')).toHaveLength(1)
})

test('speaks Portuguese when the hub says so', async ($, on) => {
  const status = world(on, 2500)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  await $.turn.start({ text: 'go', turnId: 't-1' })
  await step($ as never)

  expect(status.at(-1)).toBe('saída 2.5k tokens')
})
