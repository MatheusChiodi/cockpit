import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'fdiff',
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

const patch = ['diff --git a/a.ts b/a.ts', 'index 1..2 100644', '--- a/a.ts', '+++ b/a.ts', '@@ -1 +1 @@', '-old', '+new', ''].join('\n')

test('prints the diff of the file against HEAD without the git header lines', async ($, on) => {
  const argvs: string[] = []
  root(on)
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, patch)
  })

  expect((await $.command.run(run('a.ts'))).text).toBe(['--- a/a.ts', '+++ b/a.ts', '@@ -1 +1 @@', '-old', '+new'].join('\n'))
  expect(argvs).toEqual(['git --no-pager diff HEAD --no-color --unified=2 -- a.ts'])
})

test('asks for a path, and refuses outside paths and secret files', async ($, on) => {
  const argvs: string[] = []
  root(on)
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, patch)
  })

  expect((await $.command.run(run())).text).toBe('Usage: /fdiff <path>')
  expect((await $.command.run(run('../a.ts'))).text).toBe('Outside the project: ../a.ts')
  expect((await $.command.run(run('config/.env.production'))).text).toBe('config/.env.production may hold secrets: diff not printed.')
  expect(argvs).toEqual([])
})

test('says when nothing changed or git fails, and caps long diffs', async ($, on) => {
  let answer = done(0, '')
  root(on)
  on('process.run', () => answer)

  expect((await $.command.run(run('a.ts'))).text).toBe('No changes in a.ts since the last commit.')

  answer = done(0, Array.from({ length: 50 }, (_, i) => `+line ${i}`).join('\n'))
  const lines = ((await $.command.run(run('a.ts'))).text ?? '').split('\n')
  expect(lines.length).toBe(41)
  expect(lines.at(-1)).toBe('… 10 more lines not shown')

  answer = done(128, '', 'fatal')
  expect((await $.command.run(run('a.ts'))).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  root(on)
  on('process.run', () => done(0, ''))

  expect((await $.command.run(run('a.ts'))).text).toBe('Sem mudanças em a.ts desde o último commit.')
})

test('takes an absolute or quoted path inside the project and diffs it relative to the root', async ($, on) => {
  const argvs: string[] = []
  root(on)
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.at(-1) ?? '')

    return done(0, '')
  })

  expect((await $.command.run(run('/work/src/./lib/../a.ts'))).text).toBe('No changes in src/a.ts since the last commit.')
  expect((await $.command.run(run('"docs/my file.md"'))).text).toBe('No changes in docs/my file.md since the last commit.')
  expect((await $.command.run(run('/elsewhere/a.ts'))).text).toBe('Outside the project: /elsewhere/a.ts')
  expect(argvs).toEqual(['src/a.ts', 'docs/my file.md'])
})

test('on Windows compares the root without case and accepts backslashes', async ($, on) => {
  const argvs: string[] = []
  on('session.root', () => ({ value: 'C:\\Work\\App' }))
  on('env.get', () => ({ value: 'Windows_NT' }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.at(-1) ?? '')

    return done(0, '')
  })

  expect((await $.command.run(run('c:\\work\\app\\src\\b.ts'))).text).toBe('No changes in src/b.ts since the last commit.')
  expect((await $.command.run(run('D:\\other\\b.ts'))).text).toBe('Outside the project: D:\\other\\b.ts')
  expect(argvs).toEqual(['src/b.ts'])
})

test('on other systems the case of the root matters', async ($, on) => {
  on('session.root', () => ({ value: '/Work' }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => done(0, ''))

  expect((await $.command.run(run('/work/a.ts'))).text).toBe('Outside the project: /work/a.ts')
})

test('keeps keys and credential files private but diffs templates', async ($, on) => {
  root(on)
  on('process.run', () => done(0, ''))

  for (const path of ['certs/server.pem', '.npmrc', 'config/aws-credentials.json', 'deploy/id_ed25519']) {
    expect((await $.command.run(run(path))).text, path).toBe(`${path} may hold secrets: diff not printed.`)
  }

  expect((await $.command.run(run('.env.example'))).text).toBe('No changes in .env.example since the last commit.')
})

test('says git is not responding when it cannot start', async ($, on) => {
  root(on)
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run('a.ts'))).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('registers /fdiff at session start', async ($, on) => {
  const names: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    names.push(e.name)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  expect(names).toEqual(['fdiff'])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  root(on)
  on('process.run', () => done(0, Array.from({ length: 45 }, (_, i) => `+l${i}`).join('\n')))

  expect((await $.command.run(run())).text).toBe('Uso: /fdiff <ruta>')
  expect((await $.command.run(run('../x'))).text).toBe('Fuera del proyecto: ../x')
  expect(((await $.command.run(run('a.ts'))).text ?? '').split('\n').at(-1)).toBe('… 5 líneas más no mostradas')
})
