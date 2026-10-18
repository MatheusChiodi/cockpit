import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'def',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

test('lists the definitions as path:line with the trimmed line, skipping secret files', async ($, on) => {
  const argvs: (readonly string[])[] = []
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv)

    return done(0, 'src/a.ts:12:export const parse = (x: string) => x\n.env:1:parse = (secret)\nlib/b.py:3:  def parse(self):\n')
  })

  expect((await $.command.run(run('parse'))).text).toBe(
    ['src/a.ts:12  export const parse = (x: string) => x', 'lib/b.py:3  def parse(self):'].join('\n'),
  )
  expect(argvs[0]?.slice(0, 6)).toEqual(['git', '--no-pager', 'grep', '-n', '-I', '--no-color'])
  expect(argvs[0]?.at(-1)).toContain('parse')
})

test('refuses anything that is not a plain name', async ($, on) => {
  const argvs: string[] = []
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, '')
  })

  for (const bad of ['', 'a b', 'x;rm', '9x', '--help']) {
    expect((await $.command.run(run(bad))).text, bad).toBe('Usage: /def <name> (letters, digits and _)')
  }

  expect(argvs).toEqual([])
})

test('says when nothing defines the name or git fails', async ($, on) => {
  let answer = done(1, '')
  on('process.run', () => answer)

  expect((await $.command.run(run('ghost'))).text).toBe('No definition of ghost found.')

  answer = done(128, '', 'fatal')
  expect((await $.command.run(run('ghost'))).text).toBe('Not a git repository, or git is not responding.')
})

test('caps the list at 30 lines', async ($, on) => {
  on('process.run', () => done(0, Array.from({ length: 35 }, (_, i) => `f${i}.ts:1:const x = 1`).join('\n')))

  const lines = ((await $.command.run(run('x'))).text ?? '').split('\n')
  expect(lines.length).toBe(31)
  expect(lines.at(-1)).toBe('… 5 more not shown')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('process.run', () => done(1, ''))

  expect((await $.command.run(run('ghost'))).text).toBe('Nenhuma definição de ghost encontrada.')
})

test('says git is not responding when it cannot start', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run('parse'))).text).toBe('Not a git repository, or git is not responding.')
})

test('skips keys, certificates and credential files, but keeps templates', async ($, on) => {
  on('process.run', () =>
    done(
      0,
      [
        'certs/server.pem:1:const token = 1',
        'config/credentials.json:2:"token": 1',
        '.npmrc:1:token=1',
        'deploy/id_rsa:1:token',
        '.env.example:1:token = (none)',
        'src/token.ts:4:export const token = () => 1',
      ].join('\n'),
    ),
  )

  expect((await $.command.run(run('token'))).text).toBe(
    ['.env.example:1  token = (none)', 'src/token.ts:4  export const token = () => 1'].join('\n'),
  )
})

test('cuts each line to 90 characters and drops lines it cannot parse', async ($, on) => {
  const long = `export function build() { ${'x'.repeat(120)} }`
  on('process.run', () => done(0, `Binary file matches\nsrc/a.ts:7:${long}\n\n`))

  expect((await $.command.run(run('build'))).text).toBe(`src/a.ts:7  ${long.slice(0, 90)}`)
})

test('trims the name and searches with a declaration pattern for it', async ($, on) => {
  const argvs: (readonly string[])[] = []
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv)

    return done(1, '')
  })

  await $.command.run(run('  UserService  '))

  const expression = argvs[0]?.at(-1) ?? ''
  expect(argvs[0]?.slice(-3)).toEqual(['-E', '-e', expression])
  expect(expression).toContain('class|interface')
  expect(expression).toContain('[[:space:]]+UserService([^[:alnum:]_]|$)')
})

test('registers /def at session start', async ($, on) => {
  const names: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => {
    names.push(e.name)

    return { value: { command: e.name } }
  })

  await $.session.start({ cwd: '/project', surface: 'terminal', isInteractive: true })
  expect(names).toEqual(['def'])
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  let answer = done(1, '')
  on('process.run', () => answer)

  expect((await $.command.run(run('ghost'))).text).toBe('No se encontró ninguna definición de ghost.')
  expect((await $.command.run(run('a-b'))).text).toBe('Uso: /def <nombre> (letras, dígitos y _)')

  answer = done(0, Array.from({ length: 32 }, (_, i) => `f${i}.ts:1:const x = 1`).join('\n'))
  expect(((await $.command.run(run('x'))).text ?? '').split('\n').at(-1)).toBe('… 2 más no mostrados')
})
