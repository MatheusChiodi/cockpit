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
