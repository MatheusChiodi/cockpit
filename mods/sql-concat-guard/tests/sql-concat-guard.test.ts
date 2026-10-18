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

const check = (tool: string, file_path: string, text: string) =>
  ({ tool, input: tool === 'Write' ? { file_path, content: text } : { file_path, old_string: '', new_string: text } }) as const

test('also catches INSERT and str.format built queries', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const call of [
    check('Edit', 'src/repo.js', 'const q = "INSERT INTO logs (msg) VALUES (" + msg + ")"'),
    check('Write', 'repo.py', 'cur.execute("DELETE FROM users WHERE id = {}".format(uid))'),
    check('Edit', 'src/repo.ts', 'await db.run(`UPDATE users SET name = ${name} WHERE id = 1`)'),
  ]) {
    expect((await $.tool.check(call)).decision, JSON.stringify(call)).toBe('ask')
  }
})

test('ignores commented-out lines, tagged templates and documentation', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const call of [
    check('Edit', 'src/repo.ts', '// const q = "SELECT * FROM users WHERE id = " + id'),
    check('Write', 'repo.py', '# cur.execute(f"SELECT * FROM users WHERE id = {uid}")'),
    check('Edit', 'src/repo.ts', 'await prisma.$queryRaw(Prisma.sql`SELECT * FROM users WHERE id = ${id}`)'),
    check('Write', 'docs/queries.md', 'const q = "SELECT * FROM users WHERE id = " + id'),
    check('Write', 'src/fixtures/sql.ts', 'const q = "SELECT * FROM users WHERE id = " + id'),
  ]) {
    expect((await $.tool.check(call)).decision, JSON.stringify(call)).toBe('allow')
  }
})

test('leaves tools other than Write and Edit alone', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'psql -c "SELECT * FROM users WHERE id = " + id' } })
  expect(verdict.decision).toBe('allow')
})

test('keeps an ask from beneath as it was', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const { tool, input } = ASKED[0] as Call
  expect(await $.tool.check({ tool, input })).toMatchObject({ decision: 'ask', reason: 'asked beneath' })
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const { tool, input } = ASKED[3] as Call
  expect((await $.tool.check({ tool, input })).reason).toContain('arma una sentencia SQL uniendo strings en Dao.java')
})
