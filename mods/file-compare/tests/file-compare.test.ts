import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'cmp',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const project = (on: any, listing: () => ReturnType<typeof done>, argvs: string[] = []) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: !e.path.endsWith('ghost.ts') }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return listing()
  })
}

const patch = ['diff --git a/a.ts b/b.ts', 'index 1..2 100644', '--- a/a.ts', '+++ b/b.ts', '@@ -1 +1 @@', '-old', '+new', ''].join('\n')

test('diffs two project files, accepting quoted names', async ($, on) => {
  const argvs: string[] = []
  project(on, () => done(1, patch), argvs)

  expect((await $.command.run(run('a.ts "docs/b.ts"'))).text).toBe(['--- a/a.ts', '+++ b/b.ts', '@@ -1 +1 @@', '-old', '+new'].join('\n'))
  expect(argvs).toEqual(['git --no-pager diff --no-index --no-color --unified=2 -- a.ts docs/b.ts'])
})

test('needs exactly two paths inside the project that exist', async ($, on) => {
  const argvs: string[] = []
  project(on, () => done(1, patch), argvs)

  expect((await $.command.run(run('a.ts'))).text).toBe('Usage: /cmp <file-a> <file-b>')
  expect((await $.command.run(run('a b c'))).text).toBe('Usage: /cmp <file-a> <file-b>')
  expect((await $.command.run(run('a.ts ../b.ts'))).text).toBe('Outside the project: ../b.ts')
  expect((await $.command.run(run('a.ts ghost.ts'))).text).toBe('Not found: ghost.ts')
  expect(argvs).toEqual([])
})

test('refuses secret files before diffing them', async ($, on) => {
  const argvs: string[] = []
  project(on, () => done(1, patch), argvs)

  expect((await $.command.run(run('.env .env.example'))).text).toBe('.env may hold secrets: not compared.')
  expect(argvs).toEqual([])
})

test('says when the files are identical or git fails', async ($, on) => {
  let answer = done(0, '')
  project(on, () => answer)

  expect((await $.command.run(run('a.ts b.ts'))).text).toBe('a.ts and b.ts are identical.')

  answer = done(129, '', 'usage')
  expect((await $.command.run(run('a.ts b.ts'))).text).toBe('git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  project(on, () => done(0, ''))

  expect((await $.command.run(run('a.ts b.ts'))).text).toBe('a.ts e b.ts são idênticos.')
})
