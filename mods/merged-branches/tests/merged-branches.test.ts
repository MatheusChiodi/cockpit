import { expect, test } from 'claude-code/testing'

const answer = (on: any, label: () => string) =>
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => ({
    result: { questions: e.questions, answers: { [e.questions[0].question]: label() } },
  }))

const run = {
  command: 'merged',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const REFS = 'main aaa\nfeat/login bbb\nfix/typo ccc\nfeat/wip ddd\nfeat/squashed eee\nfeat/reopened fff\n'

const repo = (calls: string[], ghMissing = false) => (_: unknown, e: any) => {
  const call = e.argv.join(' ')
  calls.push(call)

  if (e.argv[0] === 'gh') {
    if (ghMissing) throw new Error('spawn gh ENOENT')

    // fix/typo was squash merged; feat/reopened got new commits after its merge.
    return done(0, JSON.stringify([
      { headRefName: 'feat/squashed', headRefOid: 'eee' },
      { headRefName: 'feat/reopened', headRefOid: 'old' },
    ]))
  }

  if (call.includes('for-each-ref')) return done(0, REFS)
  if (call.includes('--show-current')) return done(0, 'feat/wip\n')
  if (call.includes('symbolic-ref')) return done(0, 'origin/main\n')
  if (call.includes('--merged')) return done(0, 'main\nfeat/login\n')

  return done(0)
}

test('deletes the merged branches after the person says yes', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'yes')

  expect((await $.command.run(run)).text).toBe('Deleted 2 branch(es).')
  expect(calls).toContain('git --no-pager branch -d feat/login')
  expect(calls).toContain('git --no-pager branch -D feat/squashed')
  expect(calls.some(call => call.endsWith('feat/wip') || call.endsWith('feat/reopened') || call.endsWith(' main'))).toBe(false)
})

test('deletes nothing when the person says no', async ($, on) => {
  const calls: string[] = []
  on('process.run', repo(calls))
  answer(on, () => 'no')

  expect((await $.command.run(run)).text).toBe('Cancelled.')
  expect(calls.some(call => call.includes('branch -d') || call.includes('branch -D'))).toBe(false)
})

test('still finds git-merged branches without gh', async ($, on) => {
  on('process.run', repo([], true))
  answer(on, () => 'yes')

  expect((await $.command.run(run)).text).toBe('Deleted 1 branch(es).')
})

test('says when nothing is merged and when it is not a repository', async ($, on) => {
  on('process.run', (_, e) =>
    e.argv.join(' ').includes('for-each-ref') ? done(0, 'main aaa\nfeat/wip ddd\n') : e.argv[0] === 'gh' ? done(0, '[]') : done(0, 'feat/wip\n'),
  )
  expect((await $.command.run(run)).text).toBe('No merged branches to delete.')
})

test('says one line outside a repository', async ($, on) => {
  on('process.run', () => done(128, '', 'not a git repository'))
  expect((await $.command.run(run)).text).toBe('Not a git repository (or git is not available).')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', repo([]))
  answer(on, () => 'não')
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Cancelado.')
})

test('reports the branches git refused to delete', async ($, on) => {
  const calls: string[] = []
  const inner = repo(calls)
  on('process.run', (_: unknown, e: any) =>
    e.argv.join(' ') === 'git --no-pager branch -D feat/squashed' ? done(1, '', 'error') : inner(_, e),
  )
  answer(on, () => 'yes')

  expect((await $.command.run(run)).text).toBe('Deleted 1 branch(es); could not delete: feat/squashed')
})

test('never offers main, master, develop or dev, nor the default branch of origin', async ($, on) => {
  const calls: string[] = []
  const asked: string[] = []
  on('process.run', (_: unknown, e: any) => {
    const call = e.argv.join(' ')
    calls.push(call)

    if (e.argv[0] === 'gh') return done(0, '[]')
    if (call.includes('for-each-ref')) return done(0, 'master a\ndevelop b\ndev c\ntrunk d\nold e\n')
    if (call.includes('--show-current')) return done(0, 'master\n')
    if (call.includes('symbolic-ref')) return done(0, 'origin/trunk\n')
    if (call.includes('--merged')) return done(0, 'master\ndevelop\ndev\ntrunk\nold\n')

    return done(0)
  })
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    asked.push(e.questions[0].question)

    return { result: { questions: e.questions, answers: { [e.questions[0].question]: 'yes' } } }
  })

  expect((await $.command.run(run)).text).toBe('Deleted 1 branch(es).')
  expect(calls).toContain('git --no-pager branch --merged origin/trunk --format=%(refname:short)')
  expect(asked[0]).toContain('Delete 1 merged branch(es)? old')
})

test('falls back to origin/main and ignores gh output that is not JSON', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_: unknown, e: any) => {
    const call = e.argv.join(' ')
    calls.push(call)

    if (e.argv[0] === 'gh') return done(0, 'not json')
    if (call.includes('for-each-ref')) return done(0, 'main a\nfeat/x b\n')
    if (call.includes('symbolic-ref')) return done(128, '', 'no origin/HEAD')
    if (call.includes('--merged')) return done(0, '')

    return done(0, '')
  })

  expect((await $.command.run(run)).text).toBe('No merged branches to delete.')
  expect(calls).toContain('git --no-pager branch --merged origin/main --format=%(refname:short)')
})

test('lists every candidate in the question', async ($, on) => {
  const asked: string[] = []
  on('process.run', repo([]))
  on('tool.call', { tool: 'AskUserQuestion' }, (_: unknown, e: any) => {
    asked.push(e.questions[0].question)

    return { result: { questions: e.questions, answers: { [e.questions[0].question]: 'no' } } }
  })

  await $.command.run(run)
  expect(asked).toEqual(['Delete 2 merged branch(es)? feat/login, feat/squashed'])
})

test('registers /merged at session start', async ($, on) => {
  const names: string[] = []
  on('session.start', (_$: unknown, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_$: unknown, e: any) => {
    names.push(e.name)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  expect(names).toEqual(['merged'])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  on('process.run', repo([]))
  answer(on, () => 'sí')
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('2 rama(s) eliminada(s).')
})
