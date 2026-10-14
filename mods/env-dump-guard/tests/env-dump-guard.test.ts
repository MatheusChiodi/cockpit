import { expect, test } from 'claude-code/testing'

const BLOCKED = ['env', 'printenv', 'env | sort', 'cd app && env', 'set', 'export -p', 'export', 'sudo printenv', 'env > dump.txt']

const ALLOWED = [
  'printenv HOME',
  'echo $PATH',
  'env FOO=bar node app.js',
  'set -e',
  'export FOO=bar',
  'npm run env',
  'git status',
]

const POWERSHELL_BLOCKED = [
  'Get-ChildItem Env:',
  'gci env:',
  'dir Env:',
  'Get-ChildItem Env: | Format-Table',
  '[Environment]::GetEnvironmentVariables()',
]

const POWERSHELL_ALLOWED = ['$env:PATH', 'Get-ChildItem Env:PATH', 'Get-ChildItem src', 'echo $env:HOME']

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses dumping the whole environment in Bash, in English by default', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('env-dump-guard blocked the command')
  }

  expect(ran).toBe(0)
})

test('lets a named variable and everyday commands through', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }

  expect(ran).toBe(ALLOWED.length)
})

test('refuses listing the Env: drive in PowerShell, lets one variable through', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  for (const command of POWERSHELL_BLOCKED) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `pb-${command}` })
    expect(answer.deny, command).toContain('env-dump-guard')
  }

  for (const command of POWERSHELL_ALLOWED) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `pa-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'env', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('env-dump-guard bloqueou o comando: listar o ambiente inteiro (env)')
})
