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
