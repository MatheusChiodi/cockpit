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

test('takes counts from 1 to 30 only', async ($, on) => {
  on('process.run', () => done(0, log))

  for (const bad of ['0', '31', '2.5', '-1', 'ten']) {
    expect((await $.command.run(run(bad))).text, bad).toBe('Usage: /recent [count 1-30]')
  }

  expect((await $.command.run(run('30'))).text).toBe(
    ['2 hours ago  src/a.ts', '2 hours ago  README.md', '3 days ago   old.ts'].join('\n'),
  )
  expect((await $.command.run(run('  2  '))).text).toBe('2 hours ago  src/a.ts\n2 hours ago  README.md\n… 1 more not shown')
})

test('lists 15 by default', async ($, on) => {
  const files = Array.from({ length: 20 }, (_, at) => `f${at}.ts`)
  on('process.run', () => done(0, ['@1 minute ago', ...files].join('\n')))

  const lines = ((await $.command.run(run())).text ?? '').split('\n')
  expect(lines).toHaveLength(16)
  expect(lines[15]).toBe('… 5 more not shown')
})

test('says git is not responding when it cannot start', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run())).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('asks git for the last 100 commits with names only', async ($, on) => {
  const seen: string[][] = []
  on('process.run', (_, e) => {
    seen.push([...e.argv])

    return done(0, '')
  })

  await $.command.run(run())
  expect(seen).toEqual([['git', '--no-pager', 'log', '-n', '100', '--name-only', '--no-color', '--format=@%ar']])
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('process.run', () => done(0, log))

  expect((await $.command.run(run('1'))).text).toBe('2 hours ago  src/a.ts\n… 2 más no mostrados')
  expect((await $.command.run(run('99'))).text).toBe('Uso: /recent [cantidad 1-30]')
})

test('speaks Portuguese for the overflow and the errors', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  let answer = done(0, log)
  on('process.run', () => answer)

  expect((await $.command.run(run('1'))).text).toBe('2 hours ago  src/a.ts\n… mais 2 não mostrados')

  answer = done(128)
  expect((await $.command.run(run())).text).toBe('Não é um repositório git com commits, ou o git não responde.')
})
