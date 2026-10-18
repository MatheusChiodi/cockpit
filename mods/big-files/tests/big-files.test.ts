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

test('shows at most the default 15, and accepts the cap of 30', async ($, on) => {
  const many = Array.from({ length: 40 }, (_, i) => `100644 blob e${i}    ${100 + i}\tf${i}.txt`).join('\n')
  on('process.run', () => done(0, many))

  const lines = ((await $.command.run(run())).text ?? '').split('\n')
  expect(lines).toHaveLength(16)
  expect(lines[0]).toBe('    139 B  f39.txt')
  expect(lines.at(-1)).toBe('(15 of 40 tracked files)')

  expect(((await $.command.run(run('30'))).text ?? '').split('\n').at(-1)).toBe('(30 of 40 tracked files)')
})

test('writes sizes in gigabytes and keeps paths with spaces', async ($, on) => {
  on('process.run', () => done(0, `100644 blob ffff 3221225472\tdata/big dump.sql\n100644 blob eeee 1023\tsmall.txt`))

  expect((await $.command.run(run())).text).toBe(['   3.0 GB  data/big dump.sql', '   1023 B  small.txt', '(2 of 2 tracked files)'].join('\n'))
})

test('says git is not responding when it cannot start', async ($, on) => {
  on('process.run', () => ({ deny: 'spawn git ENOENT' }))

  expect((await $.command.run(run())).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('refuses a negative count before asking git', async ($, on) => {
  let calls = 0
  on('process.run', () => {
    calls += 1

    return done(0, tree)
  })

  expect((await $.command.run(run('-3'))).text).toBe('Usage: /big [count 1-30]')
  expect(calls).toBe(0)
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  let answer = done(0, '')
  on('process.run', () => answer)

  expect((await $.command.run(run('x'))).text).toBe('Uso: /big [cantidad 1-30]')
  expect((await $.command.run(run())).text).toBe('Ningún archivo versionado.')
  answer = done(0, tree)
  expect((await $.command.run(run('1'))).text).toContain('(1 de 3 archivos versionados)')
})
