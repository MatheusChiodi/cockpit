import { expect, mock, test } from 'claude-code/testing'

const SENT = { value: { isSent: true, channel: 'terminal_bell' } } as const

const reply = (runs: unknown[]) => ({
  value: { exitCode: 0, stdout: JSON.stringify(runs), stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const START = { cwd: '/repo', surface: null, isInteractive: true } as const

test('notifies once when a run seen in progress completes', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let runs: unknown[] = [{ databaseId: 7, status: 'in_progress', conclusion: null, workflowName: 'build' }]
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(runs))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.start(START)
  await clock.advance(120000)
  expect(sent).toEqual([])

  runs = [{ databaseId: 7, status: 'completed', conclusion: 'success', workflowName: 'build' }]
  await clock.advance(120000)
  expect(sent).toEqual(['CI passed: build'])

  await clock.advance(360000)
  expect(sent).toHaveLength(1)
})

test('says the conclusion of a failed run, and ignores a run that was already done', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let runs: unknown[] = [{ databaseId: 1, status: 'completed', conclusion: 'success', workflowName: 'old' }]
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () => reply(runs))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.start(START)
  await clock.advance(120000)
  expect(sent).toEqual([])

  runs = [{ databaseId: 2, status: 'queued', conclusion: null, workflowName: 'deploy' }]
  await clock.advance(120000)
  runs = [{ databaseId: 2, status: 'completed', conclusion: 'failure', workflowName: 'deploy' }]
  await clock.advance(120000)
  expect(sent).toEqual(['CI failed: deploy (failure)'])
})

test('stays silent when gh fails, and speaks the hub language', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let isBroken = true
  let runs: unknown[] = [{ databaseId: 3, status: 'in_progress', conclusion: null, workflowName: 'ci' }]
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', () =>
    isBroken
      ? { value: { exitCode: 1, stdout: '', stderr: 'no gh', isStdoutTruncated: false, isStderrTruncated: false } }
      : reply(runs),
  )
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))
  on('ui.notify', (_, e) => {
    sent.push(e.text)

    return SENT
  })

  await $.session.start(START)
  await clock.advance(120000)
  expect(sent).toEqual([])

  isBroken = false
  await clock.advance(120000)
  runs = [{ databaseId: 3, status: 'completed', conclusion: 'success', workflowName: 'ci' }]
  await clock.advance(120000)
  expect(sent).toEqual(['CI passou: ci'])
})
