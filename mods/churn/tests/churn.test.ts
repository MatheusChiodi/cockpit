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

test('breaks ties by path and leaves out every kind of lockfile, nested too', async ($, on) => {
  const tied = ['@', '', 'z.ts', 'a.ts', 'web/yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock', ''].join('\n')
  on('process.run', () => done(0, tied))

  expect((await $.command.run(run())).text).toBe(['changes per file in the last 1 commits', '   1  a.ts', '   1  z.ts'].join('\n'))
})

test('accepts the edges of the count and refuses fractions and negatives', async ($, on) => {
  on('process.run', () => done(0, log))

  expect((await $.command.run(run('30'))).text).toContain('src/b.ts')
  expect((await $.command.run(run('1'))).text).not.toContain('src/b.ts')

  for (const bad of ['1.5', '-2']) {
    expect((await $.command.run(run(bad))).text, bad).toBe('Usage: /churn [count 1-30]')
  }
})

test('asks git for the last 300 commits with their file names', async ($, on) => {
  const asked: (readonly string[])[] = []
  on('process.run', (_, e) => {
    asked.push(e.argv)

    return done(0, log)
  })

  await $.command.run(run())
  expect(asked[0]).toEqual(['git', '--no-pager', 'log', '-n', '300', '--name-only', '--no-color', '--format=@'])
})

test('says git is not responding when it cannot start', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run())).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('speaks Portuguese and Spanish for usage, empty history and git failure', async ($, on) => {
  let lang = 'pt'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  let answer = done(0, '')
  on('process.run', () => answer)

  expect((await $.command.run(run('99'))).text).toBe('Uso: /churn [quantidade 1-30]')
  expect((await $.command.run(run())).text).toBe('Nenhuma alteração de arquivo no histórico recente.')

  lang = 'es'
  expect((await $.command.run(run('0'))).text).toBe('Uso: /churn [cantidad 1-30]')
  expect((await $.command.run(run())).text).toBe('Ningún cambio de archivo en el historial reciente.')
  answer = done(128, '', 'fatal')
  expect((await $.command.run(run())).text).toBe('No es un repositorio git con commits, o git no responde.')
  answer = done(0, log)
  expect((await $.command.run(run())).text).toContain('cambios por archivo en los últimos 3 commits')
})
