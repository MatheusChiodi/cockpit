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

test('names the mode or the target in the reason', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const mode = await $.tool.call({ tool: 'Bash', command: 'chmod -R o+w shared', tool_use_id: 'm-1' })
  expect(mode.deny).toBe('chmod-guard blocked the command: making files writable by everyone (chmod o+w). Use a narrower permission, or ask the user to run it by hand.')

  const owner = await $.tool.call({ tool: 'Bash', command: 'sudo chgrp --recursive staff /usr', tool_use_id: 'm-2' })
  expect(owner.deny).toContain('changing ownership recursively on "/usr"')
})

test('reads four-digit modes by their last digit', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  expect((await $.tool.call({ tool: 'Bash', command: 'chmod 1777 /tmp/cache', tool_use_id: 'o-1' })).deny).toContain('chmod 1777')
  expect((await $.tool.call({ tool: 'Bash', command: 'chmod 2775 shared', tool_use_id: 'o-2' })).deny).toBeUndefined()
  expect((await $.tool.call({ tool: 'Bash', command: 'chmod 0750 bin', tool_use_id: 'o-3' })).deny).toBeUndefined()
})

test('a non-recursive chown on root, or a recursive one on a project folder, goes through', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of ['chown me /', 'chown -R me:me /home/me/project', 'echo chmod 777 x']) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `c-${command}` })).deny, command).toBeUndefined()
  }

  expect((await $.tool.call({ tool: 'Bash', command: 'ls | chmod 666 log', tool_use_id: 'c-pipe' })).deny).toContain('chmod 666')
})

test('refuses icacls grants to the Portuguese group and to the Everyone SID', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  for (const command of ['icacls D:\\share /grant Todos:M', 'icacls . /grant *S-1-1-0:(W)']) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `i-${command}` })
    expect(answer.deny, command).toContain('granting Everyone write access (icacls)')
  }

  const own = await $.tool.call({ tool: 'PowerShell', command: 'icacls . /grant me:F', tool_use_id: 'i-me' })
  expect(own.deny).toBeUndefined()
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'chown -R me ~', tool_use_id: 'es-1' })
  expect(answer.deny).toBe('chmod-guard bloqueó el comando: cambiar el propietario recursivamente en "~". Usa un permiso más restringido, o pide al usuario que lo ejecute a mano.')
})
