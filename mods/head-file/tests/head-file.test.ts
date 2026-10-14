import { expect, test } from 'claude-code/testing'

const PT = { value: { value: 'pt', version: 1 } } as const

const run = (args = '') => ({
  command: 'head',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

// A fake project: file name to text, '' for an empty file, and folders listed in `dirs`.
const project = (on: any, files: Record<string, string>, dirs: string[] = []) => {
  const find = (path: string) => path.replaceAll('\\', '/').replace(/^.*?\/work\//, '')

  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('fs.stat', (_: unknown, e: { path: string }) => {
    const name = find(e.path)

    if (dirs.includes(name)) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false } }

    return name in files ? { value: { kind: 'file', size: 1, mtimeMs: 0, isLink: false } } : { deny: 'ENOENT' }
  })
  on('fs.read', (_: unknown, e: { path: string }) => {
    const text = files[find(e.path)]

    return text === undefined ? { deny: 'EISDIR' } : { value: text }
  })
}

test('prints the first lines numbered and counts what was left out', async ($, on) => {
  project(on, { 'src/a.ts': 'one\ntwo\nthree\nfour\n' })

  expect((await $.command.run(run('src/a.ts 2'))).text).toBe(
    ['   1  one', '   2  two', '… 2 more lines not shown'].join('\n'),
  )
  expect((await $.command.run(run('"src/a.ts"'))).text).toBe(['   1  one', '   2  two', '   3  three', '   4  four'].join('\n'))
})

test('refuses secret files, outside paths, folders and missing files', async ($, on) => {
  project(on, { '.env': 'TOKEN=abc', 'keys/server.pem': 'x', '.env.example': 'TOKEN=' }, ['src'])

  expect((await $.command.run(run('.env'))).text).toBe('.env may hold secrets: not printed.')
  expect((await $.command.run(run('keys/server.pem'))).text).toBe('keys/server.pem may hold secrets: not printed.')
  expect((await $.command.run(run('.env.example'))).text).toBe('   1  TOKEN=')
  expect((await $.command.run(run('../etc/passwd'))).text).toBe('Outside the project: ../etc/passwd')
  expect((await $.command.run(run('src'))).text).toBe('Not a file: src')
  expect((await $.command.run(run('ghost.ts'))).text).toBe('Not found: ghost.ts')
  expect((await $.command.run(run())).text).toBe('Usage: /head <path> [lines]')
})

test('says when the file is empty', async ($, on) => {
  project(on, { 'empty.txt': '' })

  expect((await $.command.run(run('empty.txt'))).text).toBe('empty.txt is empty.')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => PT)
  project(on, { '.env': 'TOKEN=abc' })

  expect((await $.command.run(run('.env'))).text).toBe('.env pode guardar segredos: não exibido.')
})
