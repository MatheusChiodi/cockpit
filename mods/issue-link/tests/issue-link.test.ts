import { expect, test } from 'claude-code/testing'

const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args: string) => ({
  command: 'closes',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const world = (calls: string[], body = 'Adds the login form.', issueExists = true) => (_: unknown, e: any) => {
  const call = e.argv.join(' ')
  calls.push(call)

  if (call.startsWith('gh pr view')) return done(0, JSON.stringify({ number: 42, body }))
  if (call.startsWith('gh issue view')) return issueExists ? done(0, '{"title":"Login fails on Safari"}') : done(1, '', 'not found')

  return done(0)
}

test('asks, then appends Closes to the body', async ($, on) => {
  const calls: string[] = []
  on('process.run', world(calls))
  answer(on, () => 'yes')

  expect((await $.command.run(run('#12'))).text).toBe('PR #42 now closes #12 when it merges.')
  expect(calls.at(-1)).toBe('gh pr edit 42 --body Adds the login form.\n\nCloses #12\n')
})

test('changes nothing when the person says no', async ($, on) => {
  const calls: string[] = []
  on('process.run', world(calls))
  answer(on, () => 'no')

  expect((await $.command.run(run('12'))).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('gh pr edit'))).toBe(false)
})

test('knows when the pull request already closes the issue', async ($, on) => {
  on('process.run', world([], 'Fixes #12 and more'))

  expect((await $.command.run(run('12'))).text).toBe('PR #42 already closes #12.')
})

test('reports a missing issue and bad usage', async ($, on) => {
  on('process.run', world([], 'x', false))

  expect((await $.command.run(run('99'))).text).toBe('Issue #99 was not found in this repository.')
  expect((await $.command.run(run('abc'))).text).toBe('Usage: /closes <issue number>')
})

test('says one line when gh is missing', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn gh ENOENT')
  })

  expect((await $.command.run(run('12'))).text).toContain('GitHub CLI (gh) is missing')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', world([], 'Fixes #12'))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('12'))).text).toBe('O PR #42 já fecha a #12.')
})
