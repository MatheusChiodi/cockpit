import { expect, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const turn = { answer: 'report', isAborted: false, turnId: 't-1', reason: 'answer' } as const

test('names a subagent that ran for 30 seconds or more', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete({ ...turn, durationMs: 72000, agentId: 'a3f9c2' })
  expect(sent).toEqual(['Subagent a3f9c2 finished in 1m 12s.'])
})

test('stays quiet for short runs, the main loop and interrupts', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete({ ...turn, durationMs: 29000, agentId: 'a1' })
  await $.turn.complete({ ...turn, durationMs: 90000 })
  await $.turn.complete({ ...turn, durationMs: 90000, agentId: 'a2', reason: 'aborted', isAborted: true })
  expect(sent).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete({ ...turn, durationMs: 45000, agentId: 'a1' })
  expect(sent).toEqual(['El subagente a1 terminó en 45s.'])
})
