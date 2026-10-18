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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  root(on)
  on('process.run', () => done(0, '.gitignore:2:*.log\tdebug.log\n'))

  expect((await $.command.run(run('debug.log'))).text).toBe('debug.log es ignorado por "*.log" (.gitignore:2)')
  expect((await $.command.run(run(''))).text).toBe('Uso: /ignored <ruta>')
  expect((await $.command.run(run('../../etc'))).text).toBe('Fuera del proyecto: ../../etc')
})

test('accepts a quoted path, an absolute path inside the project and folds dot segments', async ($, on) => {
  const argvs: string[] = []
  root(on)
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.at(-1) ?? '')

    return done(1)
  })

  await $.command.run(run('"my dir/file.txt"'))
  await $.command.run(run('/work/src/../dist/./a.js'))
  await $.command.run(run('/work'))
  expect(argvs).toEqual(['my dir/file.txt', 'dist/a.js', '.'])
  expect((await $.command.run(run('/other/a.js'))).text).toBe('Outside the project: /other/a.js')
})

test('compares Windows paths without case', async ($, on) => {
  const argvs: string[] = []
  on('session.root', () => ({ value: 'C:\\Work\\App' }))
  on('env.get', () => ({ value: 'Windows_NT' }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.at(-1) ?? '')

    return done(1)
  })

  expect((await $.command.run(run('c:\\work\\app\\Build\\out.txt'))).text).toBe('Build/out.txt is not ignored.')
  expect(argvs).toEqual(['Build/out.txt'])
  expect((await $.command.run(run('D:\\work\\app\\x'))).text).toContain('Outside the project')
})

test('says git is unavailable when it cannot start', async ($, on) => {
  root(on)
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run('a'))).text).toBe('Not a git repository, or git is not responding.')
})

test('an answer it cannot read counts as not ignored', async ($, on) => {
  root(on)
  on('process.run', () => done(0, 'garbage'))

  expect((await $.command.run(run('a'))).text).toBe('a is not ignored.')
})
