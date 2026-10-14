import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const LONG = 'word '.repeat(400)

const complete = (patch: Record<string, unknown> = {}) =>
  ({
    text: 'base',
    reason: 'answer',
    answer: LONG,
    durationMs: 1000,
    isAborted: false,
    turnId: 't1',
    ...patch,
  }) as never

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('appends a summary under a long answer, asking a small model in English', async ($, on) => {
  const asked: { model: string; system?: string; maxTokens?: number }[] = []
  on('turn.complete', () => ({ text: 'base' }))
  on('model.complete', (_$, e) => {
    asked.push({ model: e.model, system: e.system, maxTokens: e.maxTokens })

    return { value: { isAnswered: true, text: '  Short version.  ', usage: USAGE } }
  })

  const out = await $.turn.complete(complete())
  expect(out.text).toBe('TL;DR: Short version.')
  expect(asked).toHaveLength(1)
  expect(asked[0]?.model).toBe('haiku')
  expect(asked[0]?.system).toContain('in English')
  expect(asked[0]?.maxTokens).toBeLessThanOrEqual(200)
})

test('skips short answers, subagents and turns that are not answers without calling the model', async ($, on) => {
  let calls = 0
  on('turn.complete', () => ({ text: 'base' }))
  on('model.complete', () => {
    calls += 1

    return { value: { isAnswered: true, text: 'x', usage: USAGE } }
  })

  for (const patch of [{ answer: 'short' }, { agentId: 'sub' }, { reason: 'error' }, { reason: 'aborted' }]) {
    const out = await $.turn.complete(complete(patch))
    expect(out.text, JSON.stringify(patch)).toBe('base')
  }

  expect(calls).toBe(0)
})

test('keeps the answer as is when the model fails', async ($, on) => {
  on('turn.complete', () => ({ text: 'base' }))
  on('model.complete', () => ({
    value: { isAnswered: false, reason: 'api-error', status: 529, error: { message: 'overloaded' } },
  }) as never)

  expect((await $.turn.complete(complete())).text).toBe('base')
})

test('speaks the language set in the hub', async ($, on) => {
  let system = ''
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('turn.complete', () => ({ text: 'base' }))
  on('model.complete', (_$, e) => {
    system = e.system ?? ''

    return { value: { isAnswered: true, text: 'Resumo.', usage: USAGE } }
  })

  const out = await $.turn.complete(complete())
  expect(out.text).toBe('TL;DR: Resumo.')
  expect(system).toContain('Brazilian Portuguese')
})
