import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'churn',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const log = ['@', '', 'src/a.ts', 'package-lock.json', '@', '', 'src/a.ts', 'src/b.ts', '@', '', 'src/b.ts', 'src/a.ts', ''].join('\n')

test('counts the commits per file, most changed first, leaving lockfiles out', async ($, on) => {
  on('process.run', () => done(0, log))

  expect((await $.command.run(run())).text).toBe(
    ['changes per file in the last 3 commits', '   3  src/a.ts', '   2  src/b.ts'].join('\n'),
  )
  expect((await $.command.run(run('1'))).text).toBe(['changes per file in the last 3 commits', '   3  src/a.ts'].join('\n'))
})

test('refuses a bad count', async ($, on) => {
  on('process.run', () => done(0, log))

  for (const bad of ['0', '31', 'abc']) {
    expect((await $.command.run(run(bad))).text, bad).toBe('Usage: /churn [count 1-30]')
  }
})

test('says when the history is empty or git fails', async ($, on) => {
  let answer = done(0, '')
  on('process.run', () => answer)

  expect((await $.command.run(run())).text).toBe('No file changes in the recent history.')

  answer = done(128, '', 'fatal')
  expect((await $.command.run(run())).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('process.run', () => done(0, log))

  expect((await $.command.run(run('1'))).text).toContain('alterações por arquivo nos últimos 3 commits')
})
