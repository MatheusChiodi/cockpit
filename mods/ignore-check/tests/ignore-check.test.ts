import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'ignored',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const root = (on: any) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
}

test('names the rule that ignores the path', async ($, on) => {
  const argvs: string[] = []
  root(on)
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, '.gitignore:4:dist/\tdist/app.js\n')
  })

  expect((await $.command.run(run('dist/app.js'))).text).toBe('dist/app.js is ignored by "dist/" (.gitignore:4)')
  expect(argvs).toEqual(['git --no-pager check-ignore -v -- dist/app.js'])
})

test('says when the path is not ignored and asks for a path', async ($, on) => {
  root(on)
  on('process.run', () => done(1, ''))

  expect((await $.command.run(run('src/app.ts'))).text).toBe('src/app.ts is not ignored.')
  expect((await $.command.run(run())).text).toBe('Usage: /ignored <path>')
  expect((await $.command.run(run('../x'))).text).toBe('Outside the project: ../x')
})

test('says when git fails', async ($, on) => {
  root(on)
  on('process.run', () => done(128, '', 'fatal'))

  expect((await $.command.run(run('a'))).text).toBe('Not a git repository, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  root(on)
  on('process.run', () => done(1, ''))

  expect((await $.command.run(run('a'))).text).toBe('a não é ignorado.')
})
