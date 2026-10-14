import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'chmod 777 script.sh',
  'chmod -R 777 ./app',
  'chmod 0666 notes.txt',
  'chmod a+w config.json',
  'chmod o+w,g+r shared',
  'chmod a=rwx tool',
  'cd build && sudo chmod 777 out',
  'chown -R me:me /',
  'chown -R me ~',
  'chown -R www-data /home/me',
]

const ALLOWED = [
  'chmod 755 script.sh',
  'chmod 644 notes.txt',
  'chmod +x run.sh',
  'chmod u+w file',
  'chmod o-w file',
  'chmod 600 ~/.ssh/config',
  'chown -R me:me ./dist',
  'chown me file.txt',
  'ls -la',
]

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses world-writable modes and broad ownership changes, in English by default', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('chmod-guard blocked the command')
  }

  expect(ran).toBe(0)
})

test('lets narrower permissions through', async ($, on) => {
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

test('refuses icacls grants to Everyone in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  for (const command of ['icacls C:\\data /grant Everyone:F', 'icacls . /grant "Everyone:(OI)(CI)(F)" /T']) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `p-${command}` })
    expect(answer.deny, command).toContain('chmod-guard')
  }

  const allowed = await $.tool.call({
    tool: 'PowerShell',
    command: 'icacls C:\\data /grant Everyone:(R)',
    tool_use_id: 'p-ok',
  })
  expect(allowed.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'chmod 777 x', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('chmod-guard bloqueou o comando: deixar arquivos graváveis por todos (chmod 777)')
})
