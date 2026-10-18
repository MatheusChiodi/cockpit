import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'kill -9 -1',
  'sudo kill -KILL -1',
  'killall node',
  'killall -9 chrome',
  'pkill node',
  'pkill -9 -f python',
  'pkill',
  'pkill -f ".*"',
  'echo done && pkill vite',
]

const ALLOWED = [
  'kill 1234',
  'kill -9 1234',
  'kill -1 1234',
  'pkill -x vite',
  'pkill -f "vite --port 5173"',
  'pkill -f "^node server.js$"',
  'pkill -u me -x node',
  'echo killall',
  'ls -la',
]

const WINDOWS_BLOCKED = [
  'taskkill /F /IM *',
  'taskkill /F /IM explorer.exe',
  'taskkill /IM "svchost.exe" /F',
  'taskkill /F /IM node* /T',
  'Stop-Process -Name *',
  'Stop-Process -Name "chrom*" -Force',
  'Get-Process | Stop-Process',
]

const WINDOWS_ALLOWED = [
  'taskkill /F /PID 4321',
  'taskkill /F /IM myapp.exe',
  'Stop-Process -Id 4321',
  'Stop-Process -Name myapp',
  'Get-Process -Name myapp | Stop-Process',
  'Get-Process',
]

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses broad kills in Bash, in English by default', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('kill-guard blocked the command')
  }

  expect(ran).toBe(0)
})

test('lets a kill of one explicit target through', async ($, on) => {
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

test('refuses wildcard and system kills in PowerShell, lets named ones through', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  for (const command of WINDOWS_BLOCKED) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `pb-${command}` })
    expect(answer.deny, command).toContain('kill-guard')
  }

  for (const command of WINDOWS_ALLOWED) {
    const answer = await $.tool.call({ tool: 'PowerShell', command, tool_use_id: `pa-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'killall node', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('kill-guard bloqueou o comando: encerrar todos os processos por nome (killall)')
})

test('names the reason it refused', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  const cases: readonly (readonly ['Bash' | 'PowerShell', string, string])[] = [
    ['Bash', 'kill -9 -1', 'sending a signal to every process (kill -1)'],
    ['Bash', 'pkill', 'pkill with no pattern'],
    ['Bash', 'pkill -f node', 'pkill with a loose pattern "node"'],
    ['PowerShell', 'taskkill /F /IM explorer.exe', 'killing every "explorer.exe" process (taskkill /IM)'],
    ['PowerShell', 'Stop-Process -Name "chrom*"', 'stopping processes by wildcard "chrom*" (Stop-Process)'],
    ['PowerShell', 'gps | spps', 'stopping every process (Get-Process | Stop-Process)'],
  ]

  for (const [tool, command, why] of cases) {
    const answer = await $.tool.call({ tool, command, tool_use_id: `r-${command}` })
    expect(answer.deny, command).toBe(`kill-guard blocked the command: ${why}. Kill one explicit pid instead, or ask the user to run it by hand.`)
  }
})

test('checks Windows kills sent through Bash too, and every segment of a chain', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of ['taskkill.exe /F /IM node*', 'npm test; killall5', 'ls || sudo pkill node', 'echo a\npkill vite']) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `c-${command}` })).deny, command).toContain('kill-guard')
  }
})

test('the value of a pkill flag is not taken for the pattern', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Bash', command: 'pkill -u root', tool_use_id: 'f-1' })
  expect(answer.deny).toContain('pkill with no pattern')

  const exactAll = await $.tool.call({ tool: 'Bash', command: 'pkill -x ".*"', tool_use_id: 'f-2' })
  expect(exactAll.deny).toContain('kill-guard')
})

test('still refuses, in English, when the hub cannot answer', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => {
    throw new Error('hub broken')
  })

  const answer = await $.tool.call({ tool: 'Bash', command: 'killall node', tool_use_id: 'x-1' })
  expect(answer.deny).toContain('kill-guard blocked the command: killing every process by name (killall)')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'Get-Process | Stop-Process', tool_use_id: 'es-1' })
  expect(answer.deny).toBe(
    'kill-guard bloqueó el comando: detener todos los procesos (Get-Process | Stop-Process). Termina un pid explícito, o pide al usuario que lo ejecute a mano.',
  )
})
