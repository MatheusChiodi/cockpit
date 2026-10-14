import { expect, test } from 'claude-code/testing'

const run = (args = '') => ({
  command: 'prdiff',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const pr = {
  number: 42,
  headRefName: 'feat/login',
  baseRefName: 'main',
  additions: 120,
  deletions: 14,
  changedFiles: 3,
  files: [
    { path: 'src/login.ts', additions: 88, deletions: 2 },
    { path: 'src/api.ts', additions: 30, deletions: 12 },
    { path: 'README.md', additions: 2, deletions: 0 },
  ],
}

test('shows the files and the totals of the current pull request', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.join(' '))

    return done(0, JSON.stringify(pr))
  })

  expect((await $.command.run(run())).text?.split('\n')).toEqual([
    'PR #42  feat/login → main  3 file(s)  +120 -14',
    '  +88  -2   src/login.ts',
    '  +30  -12  src/api.ts',
    '  +2   -0   README.md',
  ])
  expect(calls[0]).toBe('gh pr view --json number,headRefName,baseRefName,additions,deletions,changedFiles,files')
})

test('takes a pull request number and rejects other arguments', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.join(' '))

    return done(0, JSON.stringify(pr))
  })

  await $.command.run(run('#42'))
  expect(calls[0]).toContain('gh pr view 42 --json')
  expect((await $.command.run(run('main; rm'))).text).toBe('Usage: /prdiff [number]')
})

test('caps a long file list', async ($, on) => {
  const files = Array.from({ length: 30 }, (_, i) => ({ path: `f${i}.ts`, additions: 1, deletions: 1 }))
  on('process.run', () => done(0, JSON.stringify({ ...pr, files, changedFiles: 30 })))

  const lines = (await $.command.run(run())).text?.split('\n') ?? []
  expect(lines).toHaveLength(27)
  expect(lines.at(-1)).toBe('  … and 5 more file(s)')
})

test('says one line when gh is missing', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn gh ENOENT')
  })

  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => done(0, JSON.stringify(pr)))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run())).text).toContain('3 arquivo(s)')
})
