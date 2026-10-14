import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'rm -rf /',
  'sudo rm -rf ~',
  'cd build && rm -fr ..',
  'rm -r --force "$HOME"',
  'mkfs.ext4 /dev/sda1',
  'dd if=/dev/zero of=/dev/sda bs=1M',
]

const ALLOWED = ['rm -rf node_modules', 'rm notes.txt', 'ls -la /', 'git status']

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses destructive removals in Bash, in English by default', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('rm-guard blocked the command')
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

test('refuses a recursive Remove-Item on a drive root in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  const blocked = await $.tool.call({
    tool: 'PowerShell',
    command: 'Remove-Item -Recurse -Force C:\\',
    tool_use_id: 'p-1',
  })
  expect(blocked.deny).toContain('rm-guard')

  const allowed = await $.tool.call({
    tool: 'PowerShell',
    command: 'Remove-Item -Recurse -Force .\\dist',
    tool_use_id: 'p-2',
  })
  expect(allowed.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'rm -rf /', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('rm-guard bloqueou o comando: apagar recursivamente "/"')
})
