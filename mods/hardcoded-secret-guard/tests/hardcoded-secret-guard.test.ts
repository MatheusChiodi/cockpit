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
