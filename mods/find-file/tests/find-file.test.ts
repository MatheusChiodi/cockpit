import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'ff',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const tracked = (on: any, files: string[], exitCode = 0) =>
  on('process.run', () => ({
    value: { exitCode, stdout: files.join('\n') + '\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))

test('ranks exact names, then prefixes, then names, then paths', async ($, on) => {
  tracked(on, [
    'tests/login/readme.md',
    'src/hooks/useLogin.ts',
    'src/login.tsx',
    'src/login-form.tsx',
    'docs/login.md',
  ])

  expect((await $.command.run(run('login'))).text).toBe(
    ['docs/login.md', 'src/login.tsx', 'src/login-form.tsx', 'src/hooks/useLogin.ts', 'tests/login/readme.md', '5 files'].join(
      '\n',
    ),
  )
})

test('matches without regard to case', async ($, on) => {
  tracked(on, ['src/App.tsx', 'src/other.ts'])

  expect((await $.command.run(run('APP'))).text).toBe('src/App.tsx\n1 files')
})

test('caps the list at 20 and reports the total', async ($, on) => {
  tracked(on, Array.from({ length: 35 }, (_, i) => `src/item${String(i).padStart(2, '0')}.ts`))

  const lines = ((await $.command.run(run('item'))).text ?? '').split('\n')
  expect(lines.length).toBe(21)
  expect(lines.at(-1)).toBe('20 of 35 files')
})

test('says when nothing matches, when the text is missing, and outside a repository', async ($, on) => {
  tracked(on, ['a.ts'])
  expect((await $.command.run(run('zzz'))).text).toBe('No tracked file matches "zzz".')
  expect((await $.command.run(run(''))).text).toBe('Usage: /ff <name>')
})

test('reports a failing git', async ($, on) => {
  tracked(on, [], 128)

  expect((await $.command.run(run('a'))).text).toBe('git not found or not a repository.')
})

test('speaks the language set in the hub', async ($, on) => {
  tracked(on, ['a.ts'])
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('zzz'))).text).toBe('Nenhum arquivo versionado combina com "zzz".')
})
