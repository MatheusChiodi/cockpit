import { expect, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const turn = { answer: '', durationMs: 5000, isAborted: false, turnId: 't-1' } as const

test('notifies once when a turn ends on an error, and on a refusal', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete({ ...turn, reason: 'error' })
  expect(sent).toEqual(['The turn ended with an error.'])

  await $.turn.complete({ ...turn, reason: 'refusal', refusal: { category: null, explanation: null } })
  expect(sent).toHaveLength(2)
  expect(sent[1]).toContain('refused')
})

test('stays quiet for answers, interrupts and subagents', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete({ ...turn, reason: 'answer' })
  await $.turn.complete({ ...turn, reason: 'aborted', isAborted: true })
  await $.turn.complete({ ...turn, reason: 'error', agentId: 'agent-1' })
  expect(sent).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete({ ...turn, reason: 'error' })
  expect(sent).toEqual(['O turno terminou com erro.'])
})
