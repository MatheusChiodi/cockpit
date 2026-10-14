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
