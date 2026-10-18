import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'psql -c "DROP TABLE users"',
  'mysql -e "truncate table orders"',
  'psql -c "DELETE FROM users;"',
  'psql -c "UPDATE users SET active = false;"',
]

const ALLOWED = [
  'psql -c "DELETE FROM users WHERE id = 1;"',
  'psql -c "UPDATE users SET active = false WHERE id = 1;"',
  'psql -c "SELECT * FROM users"',
  'npm run db:update',
]

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses destructive SQL and lets statements with WHERE through', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('sql-guard blocked the command')
  }

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }
})

test('refuses destructive SQL in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  const answer = await $.tool.call({
    tool: 'PowerShell',
    command: 'sqlcmd -Q "DELETE FROM users;"',
    tool_use_id: 'p-1',
  })
  expect(answer.deny).toContain('DELETE without WHERE empties the whole table')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({
    tool: 'Bash',
    command: 'psql -c "DELETE FROM users;"',
    tool_use_id: 'pt-1',
  })
  expect(answer.deny).toContain('sql-guard bloqueou o comando: DELETE sem WHERE apaga a tabela toda')
})

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `x-${command}` })

test('names the reason for each kind of statement', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const CASES: [string, string][] = [
    ['psql -c "drop database app"', 'DROP deletes the whole object'],
    ["mysql -e 'DROP SCHEMA reporting'", 'DROP deletes the whole object'],
    ['psql -c "TRUNCATE orders"', 'TRUNCATE deletes every row with no rollback'],
    ["sqlite3 app.db 'delete from sessions'", 'DELETE without WHERE empties the whole table'],
    ["psql -c 'update accounts set balance = 0'", 'UPDATE without WHERE changes every row'],
  ]

  for (const [command, reason] of CASES) {
    expect((await bash($, command)).deny, command).toBe(`sql-guard blocked the command: ${reason}. Ask the user to run it by hand if it is intended.`)
  }
})

test('never runs a refused command', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of BLOCKED) {
    await bash($, command)
  }

  expect(ran).toBe(0)
})

test('lets other DROP targets and look-alike words through', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of ['psql -c "DROP INDEX idx_users_email"', 'psql -c "DROP VIEW v_report"', 'echo "update docs"', 'echo "deleted from cache"', 'apt-get update']) {
    expect((await bash($, command)).deny, command).toBeUndefined()
  }
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await bash($, 'psql -c "UPDATE users SET active = false;"')).deny).toBe(
    'sql-guard bloqueó el comando: UPDATE sin WHERE modifica todas las filas. Pide al usuario que lo ejecute a mano si es intencional.',
  )
})
