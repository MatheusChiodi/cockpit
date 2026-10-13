import { expect, test } from 'claude-code/testing'

const BLOCKED = ['psql -c "DROP TABLE users"', 'mysql -e "truncate table orders"', 'psql -c "DELETE FROM users;"', 'psql -c "UPDATE users SET active = false;"']

const ALLOWED = ['psql -c "DELETE FROM users WHERE id = 1;"', 'psql -c "UPDATE users SET active = false WHERE id = 1;"', 'psql -c "SELECT * FROM users"', 'npm run db:update']

test('recusa SQL destrutivo e libera o que tem WHERE', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('sql-guard')
  }

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }
})
