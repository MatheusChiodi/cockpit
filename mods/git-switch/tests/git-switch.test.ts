import { expect, test } from 'claude-code/testing'

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args: string) => ({
  command: 'gsw',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

// A repository on feat/x with `status` pending and `stashes` listed; "other" is the only other branch.
const repo = (calls: string[], state: { status: string; stashes: string }) => (_: unknown, e: any) => {
  const call = e.argv.slice(2).join(' ')
  calls.push(call)

  if (call === 'rev-parse --abbrev-ref HEAD') return done(0, 'feat/x\n')
  if (call === 'rev-parse --verify --quiet refs/heads/other') return done(0, 'abc\n')
  if (call.startsWith('rev-parse --verify')) return done(1)
  if (call === 'status --porcelain') return done(0, state.status)
  if (call === 'stash list') return done(0, state.stashes)

  return done(0)
}

test('switches a clean tree straight away', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls, { status: '', stashes: '' }))

  expect((await $.command.run(run('other'))).text).toBe('Switched to other.')
  expect(calls).toContain('switch other')
  expect(calls.some(call => call.startsWith('stash push'))).toBe(false)
})

test('stashes dirty work before switching, only when the person chooses it', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls, { status: ' M a.ts\n?? b.ts\n', stashes: '' }))
  let label = 'cancel'
  answer(on, () => label)

  expect((await $.command.run(run('other'))).text).toBe('Cancelled.')
  expect(calls.some(call => call.startsWith('switch'))).toBe(false)

  label = 'stash and switch'
  const text = (await $.command.run(run('other'))).text
  expect(text).toBe('Stashed the work of feat/x.\nSwitched to other.')
  expect(calls).toContain('stash push -u -m gsw: feat/x')
})

test('offers the saved work back when returning', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls, { status: '', stashes: 'stash@{1}: On other: gsw: other\n' }))
  answer(on, () => 'yes')

  const text = (await $.command.run(run('other'))).text
  expect(text).toBe('Switched to other.\nStash popped.')
  expect(calls).toContain('stash pop stash@{1}')
})

test('reports a missing branch and bad usage', async ($, on) => {
  on('process.run', repo([], { status: '', stashes: '' }))

  expect((await $.command.run(run('nope'))).text).toContain('No local branch "nope"')
  expect((await $.command.run(run(''))).text).toBe('Usage: /gsw <branch>')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', repo([], { status: '', stashes: '' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('other'))).text).toBe('Agora em other.')
})
