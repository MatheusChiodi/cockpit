import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/repo.ts', old_string: '', new_string: 'const q = "SELECT * FROM users WHERE id = " + id' } },
  { tool: 'Edit', input: { file_path: 'src/repo.ts', old_string: '', new_string: "db.query(`DELETE FROM sessions WHERE token = '${token}'`)" } },
  { tool: 'Write', input: { file_path: 'repo.py', content: 'cur.execute(f"SELECT * FROM users WHERE name = \'{name}\'")' } },
  { tool: 'Write', input: { file_path: 'Dao.java', content: 'String q = "UPDATE accounts SET balance = " + amount + " WHERE id = 1";' } },
  { tool: 'Write', input: { file_path: 'repo.py', content: 'cur.execute("SELECT * FROM users WHERE id = %s" % uid)' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/repo.ts', old_string: '', new_string: 'db.query(\'SELECT * FROM users WHERE id = $1\', [id])' } },
  { tool: 'Edit', input: { file_path: 'src/repo.ts', old_string: '', new_string: 'sql`SELECT * FROM users WHERE id = ${id}`' } },
  { tool: 'Edit', input: { file_path: 'src/repo.ts', old_string: '', new_string: 'const q = "SELECT * FROM users"' } },
  { tool: 'Edit', input: { file_path: 'src/ui.ts', old_string: '', new_string: 'const label = "Update " + name' } },
  { tool: 'Edit', input: { file_path: 'src/ui.ts', old_string: '', new_string: 'const msg = `Select an item from ${list}`' } },
  { tool: 'Write', input: { file_path: 'repo.py', content: 'cur.execute("SELECT * FROM t WHERE id = %s", (uid,))' } },
  { tool: 'Write', input: { file_path: 'Dao.java', content: 'String q = "SELECT * FROM users WHERE id = ?";' } },
  { tool: 'Edit', input: { file_path: 'src/repo.test.ts', old_string: '', new_string: 'const q = "SELECT * FROM users WHERE id = " + id' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('sql-concat-guard:')
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
    input: { file_path: 'src/repo.ts', old_string: 'const q = "SELECT * FROM users WHERE id = " + id', new_string: 'const q = "SELECT * FROM users WHERE id = " + id\nconst rows = []' },
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
  expect(verdict.reason).toContain('monta um comando SQL juntando strings em src/repo.ts')
})
