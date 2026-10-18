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

test('speaks Portuguese and sends the title', async ($, on) => {
  const sent: { text: string; title?: string }[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push({ text: e.text, title: e.title })

    return SENT
  })

  await $.turn.complete({ ...turn, durationMs: 125000, agentId: 'b7' })
  expect(sent).toEqual([{ text: 'O subagente b7 terminou em 2m 05s.', title: 'Claude Code' }])
})

test('rounds the duration to the second at the 30 second threshold', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.turn.complete({ ...turn, durationMs: 29499, agentId: 'under' })
  await $.turn.complete({ ...turn, durationMs: 29500, agentId: 'over' })
  await $.turn.complete({ ...turn, durationMs: 60000, agentId: 'minute' })
  expect(sent).toEqual(['Subagent over finished in 30s.', 'Subagent minute finished in 1m 00s.'])
})

test('a notification that fails does not break the end of the turn', async ($, on) => {
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.notify', () => ({ deny: 'notifications blocked' }) as never)

  const done = await $.turn.complete({ ...turn, durationMs: 45000, agentId: 'a1' })
  expect(done.text).toBe('report')
})
