import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'loc',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

const project = (on: any, files: string[], texts: Record<string, string>) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => done(0, files.join('\n')))
  on('fs.read', (_: unknown, e: { path: string }) => {
    const path = e.path.replaceAll('\\', '/')
    const text = Object.entries(texts).find(([name]) => path.endsWith('/' + name))?.[1]

    return text === undefined ? { deny: 'ENOENT' } : { value: text }
  })
}

test('sums lines and files by extension, biggest first, with a total', async ($, on) => {
  project(on, ['a.ts', 'src/b.ts', 'README.md', 'logo.png'], { 'a.ts': 'x\ny\n', 'src/b.ts': '1\n2\n3', 'README.md': 'hi\n' })

  const lines = ((await $.command.run(run())).text ?? '').split('\n')
  expect(lines[0]).toMatch(/^\.ts\s+2 files\s+5 lines$/)
  expect(lines[1]).toMatch(/^\.md\s+1 files\s+1 lines$/)
  expect(lines[2]).toMatch(/^total\s+3 files\s+6 lines$/)
})

test('asks git for the path given and refuses one outside the project', async ($, on) => {
  const argvs: string[] = []
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, '')
  })

  expect((await $.command.run(run('../other'))).text).toBe('Outside the project: ../other')
  expect((await $.command.run(run('src'))).text).toBe('No readable tracked files in src.')
  expect(argvs).toEqual(['git --no-pager ls-files -- src'])
})

test('says when git fails', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => done(128, '', 'fatal'))

  expect((await $.command.run(run())).text).toBe('Not a git repository, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  project(on, ['a.ts'], { 'a.ts': 'x\n' })

  expect((await $.command.run(run())).text).toMatch(/1 arquivos\s+1 linhas/)
})
