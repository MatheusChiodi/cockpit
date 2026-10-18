import { expect, mock, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const reply = (pr: unknown) => ({
  value: { exitCode: 0, stdout: JSON.stringify(pr), stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

test('notifies once when the review decision changes, not on the first reading', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let pr = { number: 42, reviewDecision: '' }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(pr))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.start(START)
  await clock.advance(180000)
  expect(sent).toEqual([])

  pr = { number: 42, reviewDecision: 'CHANGES_REQUESTED' }
  await clock.advance(180000)
  expect(sent).toEqual(['PR #42: changes requested'])

  await clock.advance(540000)
  expect(sent).toHaveLength(1)

  pr = { number: 42, reviewDecision: 'APPROVED' }
  await clock.advance(180000)
  expect(sent[1]).toBe('PR #42: approved')
})

test('treats another PR as a new baseline, and stays silent without one', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let answer: ReturnType<typeof reply> | { value: { exitCode: number; stdout: string; stderr: string; isStdoutTruncated: boolean; isStderrTruncated: boolean } } = reply({ number: 1, reviewDecision: 'APPROVED' })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => answer)
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.start(START)
  await clock.advance(180000)

  answer = { value: { exitCode: 1, stdout: '', stderr: 'no pull requests', isStdoutTruncated: false, isStderrTruncated: false } }
  await clock.advance(180000)

  answer = reply({ number: 2, reviewDecision: 'REVIEW_REQUIRED' })
  await clock.advance(180000)
  expect(sent).toEqual([])
})

test('speaks the language set in the hub', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let pr = { number: 5, reviewDecision: 'REVIEW_REQUIRED' }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(pr))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.start(START)
  await clock.advance(180000)
  pr = { number: 5, reviewDecision: 'APPROVED' }
  await clock.advance(180000)
  expect(sent).toEqual(['PR #5: aprovado'])
})

// The PR the gh CLI reports is `state.pr` (raw stdout when a string); returns what was notified.
const world = (on: any, state: { pr: unknown }) => {
  const sent: { text: string; title?: string }[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () =>
    typeof state.pr === 'string'
      ? { value: { exitCode: 0, stdout: state.pr, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
      : reply(state.pr),
  )
  on('ui.notify', (_: unknown, e: { text: string; title?: string }) => {
    sent.push({ text: e.text, title: e.title })

    return SENT
  })

  return sent
}

test('says "no decision" when the decision is cleared, under the Claude Code title', async ($, on) => {
  const clock = mock.clock(on)
  const state = { pr: { number: 7, reviewDecision: 'APPROVED' } as unknown }
  const sent = world(on, state)

  await $.session.start(START)
  await clock.advance(180000)
  state.pr = { number: 7, reviewDecision: null }
  await clock.advance(180000)

  expect(sent).toEqual([{ text: 'PR #7: no decision', title: 'Claude Code' }])
})

test('ignores output that is not JSON or has no PR number', async ($, on) => {
  const clock = mock.clock(on)
  const state = { pr: { number: 3, reviewDecision: '' } as unknown }
  const sent = world(on, state)

  await $.session.start(START)
  await clock.advance(180000)
  state.pr = 'not json'
  await clock.advance(180000)
  state.pr = { reviewDecision: 'APPROVED' }
  await clock.advance(180000)
  expect(sent).toEqual([])

  // The baseline survived: a real change is still announced.
  state.pr = { number: 3, reviewDecision: 'APPROVED' }
  await clock.advance(180000)
  expect(sent.map(item => item.text)).toEqual(['PR #3: approved'])
})

test('stays silent when gh cannot start', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => {
    throw new Error('spawn gh ENOENT')
  })
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.start(START)
  await clock.advance(540000)
  expect(sent).toEqual([])
})

test('a new session takes a fresh baseline', async ($, on) => {
  const clock = mock.clock(on)
  const state = { pr: { number: 9, reviewDecision: '' } as unknown }
  const sent = world(on, state)

  await $.session.start(START)
  await clock.advance(180000)
  state.pr = { number: 9, reviewDecision: 'APPROVED' }
  await $.session.start(START)
  await clock.advance(0)
  expect(sent).toEqual([])
})

test('speaks Spanish when the hub says so', async ($, on) => {
  const clock = mock.clock(on)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  const state = { pr: { number: 4, reviewDecision: '' } as unknown }
  const sent = world(on, state)

  await $.session.start(START)
  await clock.advance(180000)
  state.pr = { number: 4, reviewDecision: 'CHANGES_REQUESTED' }
  await clock.advance(180000)
  state.pr = { number: 4, reviewDecision: 'REVIEW_REQUIRED' }
  await clock.advance(180000)
  expect(sent.map(item => item.text)).toEqual(['PR #4: cambios solicitados', 'PR #4: revisión requerida'])
})
