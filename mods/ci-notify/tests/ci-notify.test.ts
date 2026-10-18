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

// A gh that answers with whatever `answer.stdout` holds; the notifications are recorded with their options.
const world = (on: any, answer: { stdout: string }, lang = 'en') => {
  const clock = mock.clock(on)
  const sent: { text: string; title?: string }[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: answer.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  on('ui.notify', (_: unknown, e: { text: string; options?: { title?: string } }) => {
    sent.push({ text: e.text, title: e.options?.title })

    return SENT
  })

  return { clock, sent }
}

test('does not notify when a different run is the one completed', async ($, on) => {
  const answer = { stdout: JSON.stringify([{ databaseId: 5, status: 'in_progress', conclusion: null, workflowName: 'a' }]) }
  const { clock, sent } = world(on, answer)

  await $.session.start(START)
  await clock.advance(1)
  answer.stdout = JSON.stringify([{ databaseId: 6, status: 'completed', conclusion: 'success', workflowName: 'b' }])
  await clock.advance(120000)
  expect(sent).toEqual([])
})

test('falls back to generic words for a run without name or conclusion', async ($, on) => {
  const answer = { stdout: JSON.stringify([{ databaseId: 8, status: 'in_progress' }]) }
  const { clock, sent } = world(on, answer)

  await $.session.start(START)
  await clock.advance(1)
  answer.stdout = JSON.stringify([{ databaseId: 8, status: 'completed', conclusion: null }])
  await clock.advance(120000)
  expect(sent.map(item => item.text)).toEqual(['CI failed: workflow (unknown)'])
})

test('stays silent on an empty list or output that is not JSON', async ($, on) => {
  const answer = { stdout: '[]' }
  const { clock, sent } = world(on, answer)

  await $.session.start(START)
  await clock.advance(120000)
  answer.stdout = '<html>rate limited</html>'
  await clock.advance(120000)
  expect(sent).toEqual([])
})

test('asks gh for the latest run only', async ($, on) => {
  mock.clock(on)
  const argvs: string[] = []
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return reply([])
  })

  await $.session.start(START)
  expect(argvs[0]).toBe('gh run list --limit 1 --json databaseId,status,conclusion,workflowName')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  const answer = { stdout: JSON.stringify([{ databaseId: 9, status: 'in_progress', workflowName: 'ci' }]) }
  const { clock, sent } = world(on, answer, 'es')

  await $.session.start(START)
  await clock.advance(1)
  answer.stdout = JSON.stringify([{ databaseId: 9, status: 'completed', conclusion: 'cancelled', workflowName: 'ci' }])
  await clock.advance(120000)
  expect(sent.map(item => item.text)).toEqual(['CI falló: ci (cancelled)'])
})
