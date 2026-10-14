import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

const turn = { answer: '', isAborted: false, turnId: 't-1', reason: 'answer' } as const

test('summarizes a turn of 10 seconds or more: duration, tool calls, output tokens', async ($, on) => {
  const toasts: string[] = []
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.turn.start({ text: 'go', turnId: 't-1' })
  await $.tool.call({ tool: 'Bash', command: 'ls', tool_use_id: 'a' })
  await $.tool.call({ tool: 'Bash', command: 'pwd', tool_use_id: 'b' })
  await $.turn.complete({
    ...turn,
    durationMs: 24000,
    usage: { model: 'm', input_tokens: 10, output_tokens: 1800, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  })
  expect(toasts).toEqual(['Turn done: 24s · 2 tools · 1.8k tokens out'])
})

test('stays quiet for quick turns, interrupts and subagents', async ($, on) => {
  const toasts: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.turn.complete({ ...turn, durationMs: 9000 })
  await $.turn.complete({ ...turn, durationMs: 60000, reason: 'aborted', isAborted: true })
  await $.turn.complete({ ...turn, durationMs: 60000, agentId: 'a1' })
  expect(toasts).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const toasts: string[] = []
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  await $.turn.start({ text: 'go', turnId: 't-2' })
  await $.turn.complete({ ...turn, durationMs: 72000 })
  expect(toasts).toEqual(['Turno concluído: 1m 12s · 0 ferramentas · 0 tokens de saída'])
})
