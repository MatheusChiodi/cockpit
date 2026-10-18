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

// A configurable repository: answers each git call from the table, the rest with success.
const table = (calls: string[], answers: Record<string, ReturnType<typeof done>>) => (_: unknown, e: any) => {
  const call = e.argv.slice(2).join(' ')
  calls.push(call)

  return answers[call] ?? done(0)
}

test('says when the folder is not a git repository', async ($, on) => {
  const calls: string[] = []
  on('process.run', table(calls, { 'rev-parse --abbrev-ref HEAD': done(128, '', 'fatal: not a git repository') }))

  expect((await $.command.run(run(''))).text).toBe('Not a git repository (or git is not available).')
  expect(calls).toEqual(['rev-parse --abbrev-ref HEAD'])
})

test('says when git cannot start', async ($, on) => {
  on('process.run', () => {
    throw new Error('ENOENT')
  })

  expect((await $.command.run(run('merge'))).text).toBe('Not a git repository (or git is not available).')
})

test('says when there is no base branch', async ($, on) => {
  on(
    'process.run',
    table([], {
      'rev-parse --abbrev-ref HEAD': done(0, 'feat/x\n'),
      'symbolic-ref --short refs/remotes/origin/HEAD': done(1),
      'rev-parse --verify --quiet origin/main': done(1),
      'rev-parse --verify --quiet origin/master': done(1),
    }),
  )

  expect((await $.command.run(run(''))).text).toBe('No base branch found (origin/HEAD, origin/main or origin/master).')
})

test('uses origin/HEAD when set, and tells to pull on the base branch itself', async ($, on) => {
  const calls: string[] = []
  on(
    'process.run',
    table(calls, {
      'rev-parse --abbrev-ref HEAD': done(0, 'develop\n'),
      'symbolic-ref --short refs/remotes/origin/HEAD': done(0, 'origin/develop\n'),
    }),
  )

  expect((await $.command.run(run('rebase'))).text).toBe('You are on the base branch "develop". Use git pull.')
  expect(calls.some(call => call.startsWith('rev-list'))).toBe(false)
})

test('falls back to origin/master and says when nothing is behind', async ($, on) => {
  const calls: string[] = []
  on(
    'process.run',
    table(calls, {
      'rev-parse --abbrev-ref HEAD': done(0, 'feat/y\n'),
      'symbolic-ref --short refs/remotes/origin/HEAD': done(1),
      'rev-parse --verify --quiet origin/main': done(1),
      'rev-list --left-right --count origin/master...HEAD': done(0, '0\t4\n'),
    }),
  )

  expect((await $.command.run(run('merge'))).text).toBe('feat/y vs origin/master: 4 ahead, 0 behind\nAlready up to date with origin/master.')
  expect(calls.some(call => call.startsWith('status') || call.startsWith('merge'))).toBe(false)
})

test('merges after a yes, with the argument in any case', async ($, on) => {
  const calls: string[] = []
  const questions: string[] = []
  on('process.run', repo(calls))
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    questions.push(e.questions[0].question)

    return { result: { questions: e.questions, answers: { [e.questions[0].question]: 'yes' } } }
  })

  expect((await $.command.run(run('  MERGE '))).text).toBe('merge origin/main: done.')
  expect(calls).toContain('merge origin/main')
  expect(questions).toEqual(['Merge 3 new commit(s) from origin/main onto this branch?'])
})

test('cancels when the question cannot be asked', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'not interactive' }))

  expect((await $.command.run(run('rebase'))).text).toBe('Cancelled.')
  expect(calls).not.toContain('rebase origin/main')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', repo([], { dirty: true }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run(''))).text).toBe('feat/x vs origin/main: 2 adelante, 3 atrás')
  expect((await $.command.run(run('rebase'))).text).toBe('Hay cambios sin commitear en archivos rastreados. Commitea o guarda antes (/gst).')
  expect((await $.command.run(run('pull'))).text).toBe('Uso: /sync [rebase|merge]')
})
