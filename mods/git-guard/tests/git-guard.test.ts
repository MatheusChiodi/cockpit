import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'git push --force origin main',
  'git push -f',
  'git reset --hard HEAD~3',
  'git clean -fd',
  'git commit -m x --no-verify',
  'git checkout -- .',
  'git branch -D feature',
]

const ALLOWED = [
  'git push --force-with-lease',
  'git push origin feat/login',
  'git reset --soft HEAD~1',
  'git status',
  'git checkout -- src/a.ts',
]

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses destructive git and lets the rest through', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('git-guard blocked the command')
  }

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }
})

test('refuses destructive git in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'git reset --hard', tool_use_id: 'p-1' })
  expect(answer.deny).toContain('git reset --hard discards local changes')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git reset --hard', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('git-guard bloqueou o comando: git reset --hard descarta alterações locais')
})
