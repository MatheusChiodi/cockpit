import { expect, test } from 'claude-code/testing'

// Stands in for the person at the AskUserQuestion dialog that $.ui.ask opens.
const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = (args: string) => ({
  command: 'sync',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

// A repository on feat/x, 2 commits ahead and 3 behind origin/main.
const repo = (calls: string[], options: { dirty?: boolean; rebaseFails?: boolean } = {}) => (_: unknown, e: any) => {
  const call = e.argv.slice(2).join(' ')
  calls.push(call)

  if (call === 'rev-parse --abbrev-ref HEAD') return done(0, 'feat/x\n')
  if (call.startsWith('symbolic-ref')) return done(1)
  if (call === 'rev-parse --verify --quiet origin/main') return done(0, 'abc\n')
  if (call.startsWith('rev-list')) return done(0, '3\t2\n')
  if (call.startsWith('status')) return done(0, options.dirty === true ? ' M a.ts\n' : '')
  if (call === 'rebase origin/main' && options.rebaseFails === true) return done(1, '', 'CONFLICT in a.ts')

  return done(0)
}

test('shows how far the branch is from its base', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))

  expect((await $.command.run(run(''))).text).toBe('feat/x vs origin/main: 2 ahead, 3 behind')
  expect(calls).toContain('fetch --quiet origin')
  expect(calls.some(call => call.startsWith('rebase'))).toBe(false)
})

test('rebases only after the person says yes', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  let label = 'no'
  answer(on, () => label)

  expect((await $.command.run(run('rebase'))).text).toBe('Cancelled.')
  expect(calls).not.toContain('rebase origin/main')

  label = 'yes'
  expect((await $.command.run(run('rebase'))).text).toBe('rebase origin/main: done.')
  expect(calls).toContain('rebase origin/main')
})

test('refuses to rebase over a dirty tree', async ($, on) => {
  on('process.run', repo([], { dirty: true }))

  expect((await $.command.run(run('rebase'))).text).toContain('Uncommitted changes')
})

test('reports a stopped rebase', async ($, on) => {
  on('process.run', repo([], { rebaseFails: true }))
  answer(on, () => 'yes')

  const text = (await $.command.run(run('rebase'))).text
  expect(text).toContain('rebase stopped: CONFLICT in a.ts')
  expect(text).toContain('git rebase --abort')
})

test('rejects unknown arguments', async ($, on) => {
  on('process.run', repo([]))

  expect((await $.command.run(run('squash'))).text).toBe('Usage: /sync [rebase|merge]')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', repo([]))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run(''))).text).toBe('feat/x vs origin/main: 2 à frente, 3 atrás')
})
