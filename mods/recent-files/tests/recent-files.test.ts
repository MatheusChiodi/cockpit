import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'recent',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const log = ['@2 hours ago', 'src/a.ts', 'README.md', '', '@3 days ago', 'src/a.ts', 'old.ts', ''].join('\n')

test('lists each file once with when it changed last', async ($, on) => {
  on('process.run', () => done(0, log))

  expect((await $.command.run(run())).text).toBe(
    ['2 hours ago  src/a.ts', '2 hours ago  README.md', '3 days ago   old.ts'].join('\n'),
  )
})

test('caps the list and refuses a bad count', async ($, on) => {
  on('process.run', () => done(0, log))

  expect((await $.command.run(run('1'))).text).toBe('2 hours ago  src/a.ts\n… 2 more not shown')
  expect((await $.command.run(run('x'))).text).toBe('Usage: /recent [count 1-30]')
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
  on('process.run', () => done(0, ''))

  expect((await $.command.run(run())).text).toBe('Nenhuma alteração de arquivo no histórico recente.')
})
