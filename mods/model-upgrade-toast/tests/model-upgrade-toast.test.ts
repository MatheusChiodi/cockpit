import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const done = { answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

const used = (model: string) => ({
  usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model },
})

const world = (on: On, toasts: string[]) => {
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
}

test('warns once when the session moves to a pricier model family', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, ...used('claude-sonnet-5-5') })
  await $.turn.complete({ ...done, ...used('claude-sonnet-5-5') })
  expect(toasts).toEqual([])

  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })
  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })
  expect(toasts).toEqual(['Session moved from claude-sonnet-5-5 to claude-opus-5-5, a pricier model: each turn now costs more'])
})

test('stays quiet for a cheaper model, an unknown one, a subagent and a missing usage', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })
  await $.turn.complete({ ...done, ...used('claude-haiku-5-5') })
  await $.turn.complete({ ...done, ...used('some-gateway-model') })
  await $.turn.complete({ ...done, ...used('claude-fable-5-1'), agentId: 'a1' })
  await $.turn.complete({ ...done })
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  await $.turn.complete({ ...done, ...used('claude-haiku-5-5') })
  await $.turn.complete({ ...done, ...used('claude-sonnet-5-5') })
  expect(toasts).toEqual(['A sessão passou de claude-haiku-5-5 para claude-sonnet-5-5, um modelo mais caro: cada turno agora custa mais'])
})

test('warns at each step up the families', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, ...used('claude-haiku-5-5') })
  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })
  await $.turn.complete({ ...done, ...used('claude-fable-5-1') })

  expect(toasts).toEqual([
    'Session moved from claude-haiku-5-5 to claude-opus-5-5, a pricier model: each turn now costs more',
    'Session moved from claude-opus-5-5 to claude-fable-5-1, a pricier model: each turn now costs more',
  ])
})

test('warns again after going down and back up', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })
  await $.turn.complete({ ...done, ...used('claude-sonnet-5-5') })
  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })

  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toContain('from claude-sonnet-5-5 to claude-opus-5-5')
})

test('does not judge a move from an unknown model', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, ...used('gateway/custom') })
  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })
  expect(toasts).toEqual([])

  await $.turn.complete({ ...done, ...used('CLAUDE-FABLE-5-1') })
  expect(toasts).toHaveLength(1)
})

test('a subagent on another model does not change what the main loop runs', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)

  await $.turn.complete({ ...done, ...used('claude-sonnet-5-5') })
  await $.turn.complete({ ...done, ...used('claude-haiku-5-5'), agentId: 'a1' })
  await $.turn.complete({ ...done, ...used('claude-sonnet-5-5') })
  expect(toasts).toEqual([])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const toasts: string[] = []
  world(on, toasts)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  await $.turn.complete({ ...done, ...used('claude-sonnet-5-5') })
  await $.turn.complete({ ...done, ...used('claude-opus-5-5') })
  expect(toasts).toEqual(['La sesión pasó de claude-sonnet-5-5 a claude-opus-5-5, un modelo más caro: cada turno ahora cuesta más'])
})
