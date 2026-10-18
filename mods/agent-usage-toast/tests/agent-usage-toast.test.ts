import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const done = { answer: 'report', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

const usage = (input: number, output: number, read = 0, written = 0) => ({
  input_tokens: input,
  output_tokens: output,
  cache_read_input_tokens: read,
  cache_creation_input_tokens: written,
  model: 'claude-haiku-5-5',
})

// The world beneath the mod: one known subagent, and every toast recorded.
const world = (on: On, toasts: string[]) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('agent.list', () => ({ value: [{ id: 'a1', description: 'map the auth flow', type: 'Explore', status: 'completed' }] as never }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('reports the tokens a finished subagent used', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, agentId: 'a1', usage: usage(2000, 3100, 30000, 8000) })
  expect(toasts).toEqual(['Subagent "map the auth flow" done: 43.1k tokens (3.1k out) on claude-haiku-5-5'])
})

test('stays quiet for small runs, the main loop, interrupts and unknown usage', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, agentId: 'a1', usage: usage(500, 400) })
  await $.turn.complete({ ...done, usage: usage(50000, 4000) })
  await $.turn.complete({ ...done, agentId: 'a1', isAborted: true, reason: 'aborted', usage: usage(50000, 4000) })
  await $.turn.complete({ ...done, agentId: 'a1' })
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.complete({ ...done, agentId: 'a1', usage: usage(9000, 2000) })
  expect(toasts).toEqual(['Subagente "map the auth flow" terminou: 11.0k tokens (2.0k de saída) em claude-haiku-5-5'])
})

test('toasts from 10,000 tokens on, not one below', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, agentId: 'a1', usage: usage(9000, 999) })
  expect(toasts).toEqual([])

  await $.turn.complete({ ...done, agentId: 'a1', usage: usage(9000, 1000) })
  expect(toasts).toEqual(['Subagent "map the auth flow" done: 10.0k tokens (1.0k out) on claude-haiku-5-5'])
})

test('names an unlisted subagent by its id, and cuts a long description', async ($, on) => {
  const toasts: string[] = []
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('agent.list', () => ({ value: [{ id: 'long', description: 'x'.repeat(60), type: 'Explore', status: 'completed' }] as never }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.turn.complete({ ...done, agentId: 'zz9', usage: usage(20000, 500) })
  await $.turn.complete({ ...done, agentId: 'long', usage: usage(20000, 500) })

  expect(toasts[0]).toBe('Subagent "zz9" done: 20.5k tokens (500 out) on claude-haiku-5-5')
  expect(toasts[1]).toContain(`"${'x'.repeat(40)}"`)
})

test('falls back to the id when the agent list cannot be read', async ($, on) => {
  const toasts: string[] = []
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('agent.list', () => ({ deny: 'unavailable' }) as never)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.turn.complete({ ...done, agentId: 'a1', usage: usage(15000, 2500) })
  expect(toasts).toEqual(['Subagent "a1" done: 17.5k tokens (2.5k out) on claude-haiku-5-5'])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.turn.complete({ ...done, agentId: 'a1', usage: usage(9000, 2000) })
  expect(toasts).toEqual(['Subagente "map the auth flow" terminó: 11.0k tokens (2.0k de salida) en claude-haiku-5-5'])
})
