import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'sudo apt install jq',
  'cd /tmp && sudo rm x',
  'echo hi | sudo tee /etc/motd',
  'FOO=1 sudo make install',
  'doas reboot',
  'su -c "reboot"',
  'su root -c id',
]

const ALLOWED = ['echo "sudo is bad"', 'git commit -m "remove sudo"', 'pseudo --help', 'ls -la', 'npm test']

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses privilege elevation in Bash, in English by default', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('sudo-guard blocked the command')
  }

  expect(ran).toBe(0)
})

test('lets everyday commands through', async ($, on) => {
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

test('refuses runas and Start-Process -Verb RunAs in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  for (const command of ['Start-Process powershell -Verb RunAs', 'runas /user:Administrator cmd']) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `p-${command}` })
    expect(answer.deny, command).toContain('sudo-guard')
  }

  const allowed = await $.tool.call({ tool: 'PowerShell', command: 'Start-Process notepad', tool_use_id: 'p-ok' })
  expect(allowed.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'sudo reboot', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('sudo-guard bloqueou o comando: elevação de privilégio (sudo, doas)')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'su -c id', tool_use_id: 'es-1' })
  expect(answer.deny).toBe(
    'sudo-guard bloqueó el comando: ejecutar un comando como otro usuario (su -c). Ejecútalo sin elevación, o pide al usuario que lo ejecute a mano.',
  )
})

test('names the reason for each kind of elevation', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  expect((await $.tool.call({ tool: 'Bash', command: 'sudo ls', tool_use_id: 'k1' })).deny).toContain('privilege elevation (sudo, doas)')
  expect((await $.tool.call({ tool: 'Bash', command: 'su root -c ls', tool_use_id: 'k2' })).deny).toContain('(su -c)')
  expect((await $.tool.call({ tool: 'PowerShell', command: 'RUNAS /user:admin cmd', tool_use_id: 'k3' })).deny).toContain('(runas)')
  expect((await $.tool.call({ tool: 'PowerShell', command: "saps pwsh -Verb:'RunAs'", tool_use_id: 'k4' })).deny).toContain(
    'Start-Process -Verb RunAs',
  )
})

test('sees through wrappers and other elevation tools', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of ['env sudo id', 'nohup sudo ./serve', 'ls | xargs sudo rm', 'gsudo choco install jq', 'pkexec bash', 'make\nsudo make install', '(sudo id)']) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `w-${command}` })).deny, command).toContain('sudo-guard')
  }
})

test('lets look-alike words and su without a command through', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of ['sudoku --solve', 'grep sudo /etc/group', 'su postgres', 'echo runas', 'man doas.conf']) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `l-${command}` })).deny, command).toBeUndefined()
  }
})

test('refuses with the failure text when the check itself fails', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state unavailable' }))

  expect((await $.tool.call({ tool: 'Bash', command: 'sudo id', tool_use_id: 'f-1' })).deny).toBe('sudo-guard: the check failed, command refused.')
  expect(ran).toBe(0)
})
