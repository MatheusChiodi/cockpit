import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'hits',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

test('counts the matches per file, most first, with a total', async ($, on) => {
  const argvs: string[] = []
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, 'src/a.ts:2\nsrc/b.ts:12\nsrc/c.ts:5\n')
  })

  expect((await $.command.run(run('useAuth'))).text).toBe(
    ['   12  src/b.ts', '    5  src/c.ts', '    2  src/a.ts', '19 matches in 3 files'].join('\n'),
  )
  expect(argvs).toEqual(['git --no-pager grep -c -I --no-color -F -e useAuth'])
})

test('caps the list at 20 files and counts the rest', async ($, on) => {
  on('process.run', () => done(0, Array.from({ length: 25 }, (_, i) => `f${String(i).padStart(2, '0')}.ts:1`).join('\n')))

  const lines = ((await $.command.run(run('x'))).text ?? '').split('\n')
  expect(lines.length).toBe(22)
  expect(lines.at(-2)).toBe('… 5 more files not shown')
  expect(lines.at(-1)).toBe('25 matches in 25 files')
})

test('asks for a text, and says when nothing matches or git fails', async ($, on) => {
  let answer = done(1, '')
  on('process.run', () => answer)

  expect((await $.command.run(run())).text).toBe('Usage: /hits <text>')
  expect((await $.command.run(run('ghost'))).text).toBe('No match for "ghost".')

  answer = done(128, '', 'fatal')
  expect((await $.command.run(run('ghost'))).text).toBe('Not a git repository, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  on('process.run', () => done(0, 'a.ts:3\n'))

  expect((await $.command.run(run('x'))).text).toContain('3 ocorrências em 1 arquivos')
})

test('says git is not responding when it cannot start', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })

  expect((await $.command.run(run('x'))).text).toBe('Not a git repository, or git is not responding.')
})

test('orders ties by path and keeps colons inside a path', async ($, on) => {
  on('process.run', () => done(0, 'z.ts:4\nweird:name.ts:4\na.ts:4\n\n'))

  expect((await $.command.run(run('x'))).text).toBe(['    4  a.ts', '    4  weird:name.ts', '    4  z.ts', '12 matches in 3 files'].join('\n'))
})

test('searches a text that starts with a dash as a fixed string, and spaces only ask for a text', async ($, on) => {
  const argvs: string[][] = []
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push([...e.argv])

    return done(1)
  })

  expect((await $.command.run(run('   '))).text).toBe('Usage: /hits <text>')
  expect((await $.command.run(run('  --version a.b  '))).text).toBe('No match for "--version a.b".')
  expect(argvs).toEqual([['git', '--no-pager', 'grep', '-c', '-I', '--no-color', '-F', '-e', '--version a.b']])
})

test('speaks Spanish for the cap, the total and the errors', async ($, on) => {
  let answer = done(0, Array.from({ length: 21 }, (_, i) => `f${i}.ts:2`).join('\n'))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('process.run', () => answer)

  const lines = ((await $.command.run(run('x'))).text ?? '').split('\n')
  expect(lines.at(-2)).toBe('… 1 archivos más no mostrados')
  expect(lines.at(-1)).toBe('42 coincidencias en 21 archivos')

  answer = done(1)
  expect((await $.command.run(run('x'))).text).toBe('Ninguna coincidencia de "x".')
  answer = done(2)
  expect((await $.command.run(run('x'))).text).toBe('No es un repositorio git, o git no responde.')
  expect((await $.command.run(run())).text).toBe('Uso: /hits <texto>')
})
