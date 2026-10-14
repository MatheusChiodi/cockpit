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
