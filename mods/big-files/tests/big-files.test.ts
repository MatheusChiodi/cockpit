import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'big',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const tree = [
  '100644 blob aaaa    2048\tsrc/a.ts',
  '100644 blob bbbb 5242880\tassets/video.mp4',
  '100644 blob cccc      12\tREADME.md',
  '160000 commit dddd       -\tvendor/sub',
].join('\n')

test('lists the largest files first with readable sizes', async ($, on) => {
  on('process.run', () => done(0, tree))

  expect((await $.command.run(run())).text).toBe(
    ['   5.0 MB  assets/video.mp4', '   2.0 KB  src/a.ts', '     12 B  README.md', '(3 of 3 tracked files)'].join('\n'),
  )
})

test('honours the count and refuses a bad one', async ($, on) => {
  on('process.run', () => done(0, tree))

  expect(((await $.command.run(run('1'))).text ?? '').split('\n')).toEqual(['   5.0 MB  assets/video.mp4', '(1 of 3 tracked files)'])

  for (const bad of ['0', '31', 'abc', '1.5']) {
    expect((await $.command.run(run(bad))).text, bad).toBe('Usage: /big [count 1-30]')
  }
})

test('says when there are no files or git fails', async ($, on) => {
  let answer = done(0, '')
  on('process.run', () => answer)

  expect((await $.command.run(run())).text).toBe('No tracked files.')

  answer = done(128, '', 'fatal')
  expect((await $.command.run(run())).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('process.run', () => done(0, tree))

  expect((await $.command.run(run('1'))).text).toContain('(1 de 3 arquivos versionados)')
})
