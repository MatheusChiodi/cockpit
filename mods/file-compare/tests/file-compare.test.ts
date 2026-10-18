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

test('cuts a long diff at 40 lines and says how many more', async ($, on) => {
  const body = Array.from({ length: 50 }, (_, i) => `+line ${i}`)
  project(on, () => done(1, ['diff --git a/a b/b', 'index 1..2', ...body, ''].join('\n')))

  const lines = ((await $.command.run(run('a.ts b.ts'))).text ?? '').split('\n')
  expect(lines).toHaveLength(41)
  expect(lines[39]).toBe('+line 39')
  expect(lines[40]).toBe('… 10 more lines not shown')
})

test('says git is not responding when it cannot start', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('fs.exists', () => ({ value: true }))
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run('a.ts b.ts'))).text).toBe('git is not responding.')
})

test('refuses keys, credentials and the second file too', async ($, on) => {
  const argvs: string[] = []
  project(on, () => done(1, patch), argvs)

  expect((await $.command.run(run('a.ts .ssh/id_rsa'))).text).toBe('.ssh/id_rsa may hold secrets: not compared.')
  expect((await $.command.run(run('cert.pem a.ts'))).text).toBe('cert.pem may hold secrets: not compared.')
  expect((await $.command.run(run('a.ts config/credentials.json'))).text).toBe('config/credentials.json may hold secrets: not compared.')
  expect((await $.command.run(run('a.ts .env.local'))).text).toBe('.env.local may hold secrets: not compared.')
  expect(argvs).toEqual([])
})

test('folds dot segments and accepts absolute paths inside the root', async ($, on) => {
  const argvs: string[] = []
  project(on, () => done(0, ''), argvs)

  expect((await $.command.run(run('src/../a.ts /work/docs/b.ts'))).text).toBe('a.ts and docs/b.ts are identical.')
  expect((await $.command.run(run('a.ts /workspace/b.ts'))).text).toBe('Outside the project: /workspace/b.ts')
  expect(argvs).toHaveLength(1)
})

test('compares Windows paths without regard to case', async ($, on) => {
  const exists: string[] = []
  on('session.root', () => ({ value: String.raw`C:\Work` }))
  on('env.get', () => ({ value: 'Windows_NT' }))
  on('fs.exists', (_, e) => {
    exists.push(e.path)

    return { value: true }
  })
  on('process.run', () => done(0, ''))

  expect((await $.command.run(run(String.raw`c:\work\src\a.ts b.ts`))).text).toBe('src/a.ts and b.ts are identical.')
  expect(exists[0]).toBe(String.raw`c:\work\src\a.ts`)
})

test('speaks Spanish and Portuguese for the refusals', async ($, on) => {
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  project(on, () => done(1, patch))

  expect((await $.command.run(run(''))).text).toBe('Uso: /cmp <archivo-a> <archivo-b>')
  expect((await $.command.run(run('a.ts ghost.ts'))).text).toBe('No encontrado: ghost.ts')
  lang = 'pt'
  expect((await $.command.run(run('a.ts ../x'))).text).toBe('Fora do projeto: ../x')
  expect((await $.command.run(run('.npmrc a.ts'))).text).toBe('.npmrc pode guardar segredos: não comparado.')
})
