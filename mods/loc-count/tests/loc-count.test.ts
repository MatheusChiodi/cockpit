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

// Records the argv of every git run and answers with the files listed.
const recorded = (on: any, root: string, os: string | undefined, listed = '') => {
  const argvs: string[] = []
  on('session.root', () => ({ value: root }))
  on('env.get', (_: unknown, e: { name: string }) => ({ value: e.name === 'OS' ? os : undefined }))
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => {
    argvs.push(e.argv.join(' '))

    return done(0, listed)
  })

  return argvs
}

test('resolves quoted and absolute paths inside the project', async ($, on) => {
  const argvs = recorded(on, '/work', undefined)

  await $.command.run(run('"src/my dir"'))
  await $.command.run(run('/work/lib/./util'))
  await $.command.run(run('/work'))
  expect((await $.command.run(run('/elsewhere/x'))).text).toBe('Outside the project: /elsewhere/x')
  expect(argvs).toEqual(['git --no-pager ls-files -- src/my dir', 'git --no-pager ls-files -- lib/util', 'git --no-pager ls-files -- .'])
})

test('compares Windows paths without case', async ($, on) => {
  const argvs = recorded(on, String.raw`C:\Work\App`, 'Windows_NT')

  await $.command.run(run(String.raw`c:\work\app\Src`))
  expect((await $.command.run(run(String.raw`D:\other`))).text).toBe(String.raw`Outside the project: D:\other`)
  expect(argvs).toEqual(['git --no-pager ls-files -- Src'])
})

test('says when git cannot start', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => {
    throw new Error('ENOENT git')
  })

  expect((await $.command.run(run())).text).toBe('Not a git repository, or git is not responding.')
})

test('skips binaries and lock files, and files it cannot read', async ($, on) => {
  project(on, ['a.ts', 'logo.PNG', 'package-lock.lock', 'font.woff2', 'gone.ts'], { 'a.ts': 'one\n', 'logo.PNG': 'x\n', 'package-lock.lock': 'x\n', 'font.woff2': 'x\n' })

  const lines = ((await $.command.run(run())).text ?? '').split('\n')
  expect(lines).toHaveLength(2)
  expect(lines[0]).toMatch(/^\.ts\s+1 files\s+1 lines$/)
  expect(lines[1]).toMatch(/^total\s+1 files\s+1 lines$/)
})

test('counts files without an extension and empty files by name', async ($, on) => {
  project(on, ['Makefile', 'empty.txt', '.gitignore'], { Makefile: 'all:\n\techo\n', 'empty.txt': '', '.gitignore': 'node_modules\n' })

  const text = (await $.command.run(run())).text ?? ''
  expect(text).toMatch(/Makefile\s+1 files\s+2 lines/)
  expect(text).toMatch(/\.gitignore\s+1 files\s+1 lines/)
  expect(text).toMatch(/\.txt\s+1 files\s+0 lines/)
  expect(text).toMatch(/total\s+3 files\s+3 lines/)
})

test('folds the smallest types into other past fifteen rows', async ($, on) => {
  const files = Array.from({ length: 17 }, (_, index) => `f.e${index}`)
  const texts = Object.fromEntries(files.map((file, index) => [file, 'x\n'.repeat(20 - index)]))
  project(on, files, texts)

  const lines = ((await $.command.run(run())).text ?? '').split('\n')
  expect(lines).toHaveLength(17)
  expect(lines[0]).toMatch(/^\.e0\s+1 files\s+20 lines$/)
  expect(lines[15]).toMatch(/^other\s+2 files\s+9 lines$/)
  expect(lines[16]).toMatch(/^total\s+17 files\s+204 lines$/)
})

test('counts only the first 400 files and says so', async ($, on) => {
  const files = Array.from({ length: 450 }, (_, index) => `f${index}.ts`)
  project(on, files, Object.fromEntries(files.map(file => [file, 'x\n'])))

  const lines = ((await $.command.run(run())).text ?? '').split('\n')
  expect(lines[0]).toMatch(/^\.ts\s+400 files\s+400 lines$/)
  expect(lines.at(-1)).toBe('(counted the first 400 of 450 files)')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  project(on, ['a.ts'], { 'a.ts': 'x\n' })

  expect((await $.command.run(run())).text).toMatch(/1 archivos\s+1 líneas/)
  expect((await $.command.run(run('../fuera'))).text).toBe('Fuera del proyecto: ../fuera')
})
