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

test('recusa remoções destrutivas no Bash', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('rm-guard')
  }

  expect(ran).toBe(0)
})

test('deixa passar comandos comuns no Bash', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }

  expect(ran).toBe(ALLOWED.length)
})

test('recusa Remove-Item recursivo em raiz de drive no PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ({
    result: { stdout: '', stderr: '', interrupted: false },
  }))

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
