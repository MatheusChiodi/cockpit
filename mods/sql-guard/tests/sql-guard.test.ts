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
