import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/db.ts', old_string: '', new_string: 'const password = "hunter22x"' } },
  { tool: 'Write', input: { file_path: 'config.py', content: 'DB_URL = "postgres://app:s3cr3tPass@db.prod.example.com:5432/app"' } },
  { tool: 'Edit', input: { file_path: 'src/Db.java', old_string: '', new_string: 'String url = "jdbc:oracle:thin:scott/tiger99@db.corp.example.com:1521/ORCL";' } },
  { tool: 'Edit', input: { file_path: 'src/api.ts', old_string: '', new_string: `const t = "${"eyJ" + "a".repeat(12)}.${"eyJ" + "b".repeat(12)}.${"c".repeat(12)}"` } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/db.ts', old_string: '', new_string: 'const password = process.env.DB_PASSWORD' } },
  { tool: 'Edit', input: { file_path: 'src/db.ts', old_string: '', new_string: 'password: \'changeme123\',' } },
  { tool: 'Edit', input: { file_path: 'src/form.tsx', old_string: '', new_string: 'const label = \'Enter your password\'' } },
  { tool: 'Edit', input: { file_path: 'src/db.ts', old_string: '', new_string: 'const url = "postgres://user:${PASS}@db:5432/app"' } },
  { tool: 'Edit', input: { file_path: 'src/db.ts', old_string: '', new_string: 'const url = "postgres://app:s3cr3tPass@localhost:5432/app"' } },
  { tool: 'Edit', input: { file_path: 'src/auth.ts', old_string: '', new_string: 'token: \'AUTH_TOKEN_KEY\',' } },
  { tool: 'Edit', input: { file_path: 'src/auth.test.ts', old_string: '', new_string: 'const password = "hunter22x"' } },
  { tool: 'Write', input: { file_path: 'docs/setup.md', content: 'password = "hunter22x"' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('hardcoded-secret-guard:')
  }
})

test('lets similar but legitimate work through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of FINE) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('allow')
  }
})

test('counts only what the edit adds', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'src/db.ts', old_string: 'const password = "hunter22x"', new_string: 'const password = "hunter22x"\nconst retries = 3' },
  })
  expect(verdict.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('adiciona uma senha ou chave fixa em src/db.ts')
})

const SECRET = `${'k9'.repeat(3)}Zq${'x7'.repeat(2)}`

test('leaves tools other than Write and Edit alone', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: `echo password="${SECRET}"` } })
  expect(verdict.decision).toBe('allow')
})

test('keeps an ask from beneath as it was', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict).toMatchObject({ decision: 'ask', reason: 'asked beneath' })
})

test('skips fixtures, mocks, examples and sample files', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const file_path of ['src/fixtures/users.ts', 'src/__tests__/db.ts', 'mocks/api.ts', 'examples/app.py', 'config.sample', '.env.example', 'src/db.spec.mjs']) {
    const verdict = await $.tool.check({ tool: 'Write', input: { file_path, content: `api_key = "${SECRET}"` } })
    expect(verdict.decision, file_path).toBe('allow')
  }
})

test('lets placeholders, constant names and paths through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const line of ['secret: "your-secret-here"', 'apiKey = "API_KEY_NAME"', 'token = "./secrets/token.txt"', 'pwd = "short"', 'password = "<%= pass %>"', 'url = "mongodb://app:changeme@db.example.com/app"']) {
    const verdict = await $.tool.check({ tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: line } })
    expect(verdict.decision, line).toBe('allow')
  }
})

test('names the kind of secret in the reason', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const url = await $.tool.check({ tool: 'Write', input: { file_path: 'app.ts', content: `const u = "mongodb+srv://app:${SECRET}@cluster0.example.net/db"` } })
  expect(url.reason).toContain('adds a connection string with the password inside to app.ts')

  const { tool, input } = ASKED[3] as Call
  expect((await $.tool.check({ tool, input })).reason).toContain('adds what looks like a JWT to src/api.ts')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const { tool, input } = ASKED[1] as Call
  expect((await $.tool.check({ tool, input })).reason).toContain('agrega en config.py una cadena de conexión con la contraseña dentro')
})
