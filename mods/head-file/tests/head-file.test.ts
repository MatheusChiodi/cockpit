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

test('keeps the line count between 1 and 60', async ($, on) => {
  const many = Array.from({ length: 80 }, (_, at) => `line ${at + 1}`).join('\n')
  project(on, { 'big.txt': many })

  expect((await $.command.run(run('big.txt 0'))).text).toBe(['   1  line 1', '… 79 more lines not shown'].join('\n'))

  const capped = ((await $.command.run(run('big.txt 999'))).text ?? '').split('\n')
  expect(capped).toHaveLength(61)
  expect(capped[59]).toBe('  60  line 60')
  expect(capped[60]).toBe('… 20 more lines not shown')

  const standard = ((await $.command.run(run('big.txt'))).text ?? '').split('\n')
  expect(standard).toHaveLength(21)
})

test('cuts long lines at 120 characters', async ($, on) => {
  project(on, { 'wide.txt': 'x'.repeat(200) })

  expect((await $.command.run(run('wide.txt'))).text).toBe(`   1  ${'x'.repeat(120)}`)
})

test('folds dot segments and takes absolute paths inside the project', async ($, on) => {
  project(on, { '.env': 'TOKEN=abc', 'src/a.ts': 'one' })

  expect((await $.command.run(run('src/../.env'))).text).toBe('.env may hold secrets: not printed.')
  expect((await $.command.run(run('./src/a.ts'))).text).toBe('   1  one')
  expect((await $.command.run(run('/work/src/a.ts'))).text).toBe('   1  one')
  expect((await $.command.run(run('/etc/passwd'))).text).toBe('Outside the project: /etc/passwd')
})

test('treats keys, rc files and credential files as secrets', async ($, on) => {
  project(on, {})

  for (const name of ['.npmrc', '.netrc', 'id_ed25519', 'config/secrets.json', 'aws-credentials.yml', '.env.local', 'cert.p12']) {
    expect((await $.command.run(run(name))).text, name).toBe(`${name} may hold secrets: not printed.`)
  }
})

test('says so when a file exists but cannot be read', async ($, on) => {
  on('session.root', () => ({ value: '/work' }))
  on('env.get', () => ({ value: undefined }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 9_000_000, mtimeMs: 0, isLink: false } }))
  on('fs.read', () => ({ deny: 'too large' }))

  expect((await $.command.run(run('dump.bin'))).text).toBe('Could not read dump.bin (binary or over 4 MiB).')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  project(on, { 'a.txt': '1\n2\n3' })

  expect((await $.command.run(run())).text).toBe('Uso: /head <ruta> [líneas]')
  expect((await $.command.run(run('ghost.ts'))).text).toBe('No encontrado: ghost.ts')
  expect((await $.command.run(run('a.txt 1'))).text).toBe(['   1  1', '… 2 líneas más no mostradas'].join('\n'))
})
