import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'size',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

const done = (exitCode: number, stdout = '', stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

// `/work/src` is a folder, `/work/a.ts` a 2048-byte file of three lines.
const project = (on: any, listing: ReturnType<typeof done>) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('fs.stat', (_: unknown, e: { path: string }) => {
    const path = e.path.replaceAll('\\', '/')

    if (path.endsWith('/work') || path.endsWith('/src')) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false } }

    return path.endsWith('/a.ts') ? { value: { kind: 'file', size: 2048, mtimeMs: 0, isLink: false } } : { deny: 'ENOENT' }
  })
  on('fs.read', () => ({ value: 'a\nb\nc\n' }))
  on('process.run', () => listing)
}

const tree = ['100644 blob aaaa    2048\tsrc/a.ts', '100644 blob bbbb 1048576\tsrc/big.png'].join('\n')

test('sizes a file in bytes and lines', async ($, on) => {
  project(on, done(0, ''))

  expect((await $.command.run(run('a.ts'))).text).toBe(['size     2.0 KB', 'lines    3'].join('\n'))
})

test('sizes a folder by its tracked files and names the biggest', async ($, on) => {
  project(on, done(0, tree))

  const expected = ['size     1.0 MB  (tracked)', 'files    2', 'biggest  src/big.png  1.0 MB'].join('\n')
  expect((await $.command.run(run('src'))).text).toBe(expected)
  expect((await $.command.run(run())).text).toBe(expected)
})

test('refuses outside paths and says when a path is missing or has nothing tracked', async ($, on) => {
  project(on, done(0, ''))

  expect((await $.command.run(run('../x'))).text).toBe('Outside the project: ../x')
  expect((await $.command.run(run('ghost'))).text).toBe('Not found: ghost')
  expect((await $.command.run(run('src'))).text).toBe('No tracked files in src.')
})

test('says when git fails', async ($, on) => {
  project(on, done(128, '', 'fatal'))

  expect((await $.command.run(run('src'))).text).toBe('Not a git repository with commits, or git is not responding.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  project(on, done(0, ''))

  expect((await $.command.run(run('a.ts'))).text).toBe(['tamanho  2.0 KB', 'linhas   3'].join('\n'))
})
