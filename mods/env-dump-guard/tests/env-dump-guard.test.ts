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

const deny = async ($: any, tool: string, command: string) =>
  (await $.tool.call({ tool, command, tool_use_id: `${tool}-${command}` })).deny

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect(await deny($, 'Bash', 'printenv')).toBe(
    'env-dump-guard bloqueó el comando: listar todo el entorno (printenv). Lee una variable por su nombre, por ejemplo printenv HOME.',
  )
  expect(await deny($, 'PowerShell', 'gci Env:')).toContain('listar todo el entorno (Env:)')
})

test('names the dumping command it found, including declare and typeset', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  expect(await deny($, 'Bash', 'declare -x')).toContain('(declare -x)')
  expect(await deny($, 'Bash', 'typeset -p')).toContain('(typeset -p)')
  expect(await deny($, 'Bash', 'echo start; export')).toContain('(export -p)')
  expect(await deny($, 'Bash', 'command env -0')).toContain('(env)')
  expect(await deny($, 'Bash', 'false || "printenv" 2>&1')).toContain('(printenv)')
  expect(await deny($, 'Bash', 'declare -f my_fn')).toBeUndefined()
  expect(await deny($, 'Bash', 'typeset')).toBeUndefined()
})

test('refuses PowerShell forms with -Path, a wildcard or quotes', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  for (const command of ['Get-ChildItem -Path Env:', 'ls env:*', "Get-Item 'Env:'", 'gi Env:\*']) {
    expect(await deny($, 'PowerShell', command), command).toContain('env-dump-guard blocked the command')
  }
})

test('the Portuguese PowerShell reason names the Env: drive', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect(await deny($, 'PowerShell', '[Environment]::GetEnvironmentVariables()')).toBe(
    'env-dump-guard bloqueou o comando: listar o ambiente inteiro (Env:). Leia uma variável pelo nome, por exemplo printenv HOME.',
  )
})
