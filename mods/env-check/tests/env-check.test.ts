import { expect, test } from 'claude-code/testing'

const run = {
  command: 'envcheck',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

// Values built at run time so no file holds a secret-looking string.
const SECRET = `sk_${'live'.repeat(6)}`

// The project's files by name; the engine resolves paths against the host, so match on the file name.
const project = (on: any, files: Record<string, string>) => {
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''

  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', (_: unknown, e: { path: string }) => ({ value: fileOf(e.path) in files }))
  on('fs.read', (_: unknown, e: { path: string }) => ({ value: files[fileOf(e.path)] ?? '' }))
}

test('lists missing and extra keys, sorted', async ($, on) => {
  project(on, {
    '.env.example': '# database\nDATABASE_URL=\nSTRIPE_KEY=\nexport PORT=3000\n\nAPI_URL = x\n',
    '.env': `PORT=8080\nDEBUG_SQL=1\nAPI_URL=http://x\nAPI_TOKEN=${SECRET}\n`,
  })

  expect((await $.command.run(run)).text).toBe(
    ['Missing in .env', '  DATABASE_URL', '  STRIPE_KEY', 'Not in .env.example', '  API_TOKEN', '  DEBUG_SQL'].join('\n'),
  )
})

test('never prints a value', async ($, on) => {
  project(on, {
    '.env.example': 'A=\nB=\n',
    '.env': `A=${SECRET}\nC=${SECRET}\n`,
  })

  const text = (await $.command.run(run)).text ?? ''
  expect(text).toContain('  B')
  expect(text).toContain('  C')
  expect(text).not.toContain(SECRET)
  expect(text).not.toContain('live')
})

test('says when the files agree', async ($, on) => {
  project(on, { '.env.example': 'A=\nB=\n', '.env': 'B=2\nA=1\n' })

  expect((await $.command.run(run)).text).toBe('.env has all 2 keys of .env.example.')
})

test('says which file is missing', async ($, on) => {
  project(on, { '.env': 'A=1\n' })
  expect((await $.command.run(run)).text).toBe('No .env.example in this project.')
})

test('reports a missing .env', async ($, on) => {
  project(on, { '.env.example': 'A=\n' })

  expect((await $.command.run(run)).text).toBe('No .env in this project.')
})

test('speaks the language set in the hub', async ($, on) => {
  project(on, { '.env.example': 'A=\n', '.env': '' })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run)).text).toBe('Faltando no .env\n  A')
})

test('shows only the extra section when nothing is missing', async ($, on) => {
  project(on, { '.env.example': 'A=\n', '.env': 'A=1\nZ=2\n' })

  expect((await $.command.run(run)).text).toBe('Not in .env.example\n  Z')
})

test('skips comments, blank and invalid lines, reads dotted keys and CRLF files', async ($, on) => {
  project(on, {
    '.env.example': '# A=commented\r\n\r\n1BAD=x\r\nnot a key\r\nspring.datasource.url=\r\nB=\r\n',
    '.env': 'spring.datasource.url=jdbc:x\r\n   B = 2\r\n',
  })

  expect((await $.command.run(run)).text).toBe('.env has all 2 keys of .env.example.')
})

test('counts a key written twice once', async ($, on) => {
  project(on, { '.env.example': 'A=\nA=\nB=\n', '.env': 'A=1\nB=1\nB=2\n' })

  expect((await $.command.run(run)).text).toBe('.env has all 2 keys of .env.example.')
})

test('treats an unreadable .env as missing', async ($, on) => {
  const fileOf = (path: string) => path.replaceAll('\\', '/').split('/').pop() ?? ''
  on('session.root', () => ({ value: '/work' }))
  on('fs.exists', () => ({ value: true }))
  on('fs.read', (_: unknown, e: { path: string }) => (fileOf(e.path) === '.env' ? { deny: 'EACCES' } : { value: 'A=\n' }))

  expect((await $.command.run(run)).text).toBe('No .env in this project.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  project(on, { '.env.example': 'A=\nB=\n', '.env': 'A=1\nC=1\n' })

  expect((await $.command.run(run)).text).toBe('Faltan en .env\n  B\nNo están en .env.example\n  C')
})
