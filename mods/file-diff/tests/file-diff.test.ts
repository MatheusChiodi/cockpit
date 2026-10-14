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
