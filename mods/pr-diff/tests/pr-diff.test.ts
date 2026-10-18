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

test('says one line when gh fails, prints no JSON or finds no pull request', async ($, on) => {
  let answer = done(1, '', 'no pull requests found')
  on('process.run', () => answer)

  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
  answer = done(0, 'not json')
  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
  answer = done(0, '{}')
  expect((await $.command.run(run())).text).toContain('GitHub CLI (gh) is missing')
})

test('fills what gh left out with a question mark and the file count', async ($, on) => {
  on('process.run', () => done(0, JSON.stringify({ number: 7, files: [{ path: 'a.ts', additions: 1, deletions: 0 }] })))

  expect((await $.command.run(run())).text?.split('\n')).toEqual(['PR #7  ? → ?  1 file(s)  +0 -0', '  +1  -0  a.ts'])
})

test('shows only the head line for a pull request with no files', async ($, on) => {
  on('process.run', () => done(0, JSON.stringify({ ...pr, files: [], changedFiles: 0, additions: 0, deletions: 0 })))

  expect((await $.command.run(run())).text).toBe('PR #42  feat/login → main  0 file(s)  +0 -0')
})

test('a bare # is the current pull request', async ($, on) => {
  const calls: string[] = []
  on('process.run', (_, e) => {
    calls.push(e.argv.join(' '))

    return done(0, JSON.stringify(pr))
  })

  await $.command.run(run('#'))
  expect(calls[0]).toBe('gh pr view --json number,headRefName,baseRefName,additions,deletions,changedFiles,files')
  expect((await $.command.run(run('12 34'))).text).toBe('Usage: /prdiff [number]')
  expect(calls).toHaveLength(1)
})

test('speaks Spanish for the cap and the errors', async ($, on) => {
  let ok = true
  const files = Array.from({ length: 26 }, (_, i) => ({ path: `f${i}.ts`, additions: 1, deletions: 1 }))
  on('process.run', () => (ok ? done(0, JSON.stringify({ ...pr, files })) : done(1)))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const text = (await $.command.run(run())).text ?? ''
  expect(text).toContain('3 archivo(s)')
  expect(text.split('\n').at(-1)).toBe('  … y 1 archivo(s) más')
  ok = false
  expect((await $.command.run(run())).text).toContain('no hay pull request aquí')
  expect((await $.command.run(run('x'))).text).toBe('Uso: /prdiff [número]')
})
