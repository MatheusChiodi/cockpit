import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const complete = (patch: Record<string, unknown> = {}) =>
  ({
    text: 'ok',
    reason: 'answer',
    answer: 'ok',
    durationMs: 45000,
    isAborted: false,
    turnId: 't1',
    ...patch,
  }) as never

const record = (notices: { text: string; title?: string }[]) => ({ text, title }: { text: string; title?: string }) => {
  notices.push({ text, title })

  return { value: { isSent: false, reason: 'no-channel' } } as const
}

test('notifies when a long turn finishes, and when it ends in an error', async ($, on) => {
  const notices: { text: string; title?: string }[] = []
  const note = record(notices)
  on('turn.complete', () => ({ text: 'ok' }))
  on('ui.notify', ($, e) => note(e))

  await $.turn.complete(complete())
  await $.turn.complete(complete({ reason: 'error', durationMs: 31000 }))
  expect(notices).toEqual([
    { text: 'Turn finished in 45s.', title: 'Claude Code' },
    { text: 'Turn ended with an error after 31s.', title: 'Claude Code' },
  ])
})

test('stays quiet for short turns, aborted turns and subagents', async ($, on) => {
  const notices: { text: string; title?: string }[] = []
  const note = record(notices)
  on('turn.complete', () => ({ text: 'ok' }))
  on('ui.notify', ($, e) => note(e))

  await $.turn.complete(complete({ durationMs: 29000 }))
  await $.turn.complete(complete({ isAborted: true, reason: 'aborted' }))
  await $.turn.complete(complete({ agentId: 'sub' }))
  expect(notices).toHaveLength(0)

  // The threshold itself notifies.
  await $.turn.complete(complete({ durationMs: 30000 }))
  expect(notices).toHaveLength(1)
})

test('survives a notification channel that throws', async ($, on) => {
  on('turn.complete', () => ({ text: 'ok' }))
  on('ui.notify', () => {
    throw new Error('no channel')
  })

  expect((await $.turn.complete(complete())).text).toBe('ok')
})

test('speaks the language set in the hub', async ($, on) => {
  const notices: { text: string; title?: string }[] = []
  const note = record(notices)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('turn.complete', () => ({ text: 'ok' }))
  on('ui.notify', ($, e) => note(e))

  await $.turn.complete(complete())
  expect(notices[0]?.text).toBe('Turno concluído em 45s.')
})
