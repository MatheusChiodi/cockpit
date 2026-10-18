import { expect, test } from 'claude-code/testing'

const run = {
  command: 'untested',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const answer = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// git answered by its sub-command: status for the changes, ls-files for the project.
// The answers are read when git runs, so one test can change them between commands.
const git = { status: '', files: '', exitCode: 0 }

const project = (on: any, status: string, files: string) => {
  Object.assign(git, { status, files, exitCode: 0 })
  on('process.run', (_: unknown, e: { argv: string[] }) =>
    e.argv.includes('status') ? answer(git.status, git.exitCode) : answer(git.files, git.exitCode),
  )
}

test('lists the changed code files that have no test', async ($, on) => {
  project(
    on,
    [
      ' M src/cart.ts',
      ' M src/discount.ts',
      '?? src/shipping/index.ts',
      ' M README.md',
      ' M src/cart.test.ts',
      ' D src/old.ts',
      'R  src/a.ts -> src/renamed.ts',
      ' M types/api.d.ts',
    ].join('\n'),
    ['src/cart.ts', 'src/cart.test.ts', 'src/discount.ts', 'src/shipping/index.ts', 'src/shipping/shipping.spec.ts'].join('\n'),
  )

  expect((await $.command.run(run)).text).toBe(['Changed code without a test (2)', '  src/discount.ts', '  src/renamed.ts'].join('\n'))
})

test('matches python and java test names, and says when all is covered', async ($, on) => {
  project(
    on,
    [' M app/billing.py', ' M src/main/CartService.java'].join('\n'),
    ['app/billing.py', 'tests/test_billing.py', 'src/main/CartService.java', 'src/test/CartServiceTest.java'].join('\n'),
  )

  expect((await $.command.run(run)).text).toBe('Every changed code file (2) has a test.')
})

test('says when nothing changed or git is missing', async ($, on) => {
  project(on, ' M README.md', 'README.md')
  expect((await $.command.run(run)).text).toBe('No changed code files.')

  Object.assign(git, { status: '', files: '', exitCode: 128 })
  expect((await $.command.run(run)).text).toBe('Not a git repository, or git is not available.')
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, ' M src/cart.ts', 'src/cart.ts')
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Código alterado sem teste (1)\n  src/cart.ts')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  project(on, ' M src/a.ts', 'src/a.ts\nsrc/a.test.ts')
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Todos los archivos de código modificados (1) tienen test.')

  git.status = ' M README.md'
  expect((await $.command.run(run)).text).toBe('Ningún archivo de código modificado.')

  git.exitCode = 1
  expect((await $.command.run(run)).text).toBe('No es un repositorio git, o git no está disponible.')
})

test('leaves out generated, vendored and config files', async ($, on) => {
  project(
    on,
    [' M dist/app.js', ' M node_modules/x/index.js', ' M vite.config.ts', ' M coverage/lcov.js', ' M src/env.d.ts', ' M vendor/lib.php'].join('\n'),
    '',
  )

  expect((await $.command.run(run)).text).toBe('No changed code files.')
})

test('lists at most 40 files and counts the rest', async ($, on) => {
  const names = Array.from({ length: 45 }, (_, at) => `src/m${String(at).padStart(2, '0')}.ts`)
  project(on, names.map(name => `?? ${name}`).join('\n'), names.join('\n'))

  const lines = ((await $.command.run(run)).text ?? '').split('\n')
  expect(lines[0]).toBe('Changed code without a test (45)')
  expect(lines).toHaveLength(42)
  expect(lines[40]).toBe('  src/m39.ts')
  expect(lines[41]).toBe('  … +5')
})

test('reads quoted paths and matches Go, Rust and C# test names', async ($, on) => {
  project(
    on,
    ['?? "src/my file.ts"', ' M pkg/server.go', ' M src/parser/mod.rs', ' M App/Cart.cs'].join('\n'),
    ['pkg/server_test.go', 'tests/parser.rs', 'App.Tests/CartTests.cs'].join('\n'),
  )

  expect((await $.command.run(run)).text).toBe(['Changed code without a test (1)', '  src/my file.ts'].join('\n'))
})

test('says git is missing when ls-files fails even if status worked', async ($, on) => {
  on('process.run', (_, e) => (e.argv.includes('status') ? answer(' M src/a.ts') : answer('', 128)))

  expect((await $.command.run(run)).text).toBe('Not a git repository, or git is not available.')
})
