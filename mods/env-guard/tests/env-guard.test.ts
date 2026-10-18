import { expect, test } from 'claude-code/testing'

test('refuses reading and writing .env, lets templates through', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  const secret = await $.tool.call({ tool: 'Read', file_path: '/app/.env', tool_use_id: 'r1' })
  expect(secret.deny).toContain('env-guard: /app/.env holds secrets and is protected')

  const local = await $.tool.call({
    tool: 'Write',
    file_path: 'C:\\app\\.env.local',
    content: 'A=1',
    tool_use_id: 'w1',
  })
  expect(local.deny).toContain('env-guard')

  const example = await $.tool.call({ tool: 'Read', file_path: '/app/.env.example', tool_use_id: 'r2' })
  expect(example.deny).toBeUndefined()

  const source = await $.tool.call({ tool: 'Read', file_path: '/app/src/env.ts', tool_use_id: 'r3' })
  expect(source.deny).toBeUndefined()
})

test('refuses cat .env in the shell', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  const blocked = await $.tool.call({ tool: 'Bash', command: 'cat .env', tool_use_id: 'b1' })
  expect(blocked.deny).toContain('env-guard: .env holds secrets')

  const allowed = await $.tool.call({ tool: 'Bash', command: 'cat .env.example', tool_use_id: 'b2' })
  expect(allowed.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Read', file_path: '/app/.env', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('env-guard: /app/.env guarda segredos e está protegido')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Read', file_path: '/app/.env', tool_use_id: 'es-1' })
  expect(answer.deny).toBe('env-guard: /app/.env guarda secretos y está protegido. Usa un .env.example o pídeselo al usuario.')
})

test('refuses Edit on any .env variant and lets every template through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  const edit = (file_path: string) =>
    $.tool.call({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b', tool_use_id: `e-${file_path}` })

  for (const path of ['/app/.env', '/app/.env.production', '/app/.ENV', 'C:\\app\\config\\.env.test']) {
    expect((await edit(path)).deny, path).toContain('env-guard')
  }

  for (const path of ['/app/.env.example', '/app/.env.sample', '/app/.env.template', '/app/.env.dist', '/app/.envrc', '/app/env.ts']) {
    expect((await edit(path)).deny, path).toBeUndefined()
  }
})

test('refuses reading .env through PowerShell and source', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  on('tool.call', { tool: 'PowerShell' }, () => ({ result: undefined as never }))

  expect((await $.tool.call({ tool: 'Bash', command: 'source .env.production && npm start', tool_use_id: 'b1' })).deny).toContain('env-guard')
  expect((await $.tool.call({ tool: 'Bash', command: 'tail -n 3 config/.env', tool_use_id: 'b2' })).deny).toContain('env-guard')
  expect((await $.tool.call({ tool: 'PowerShell', command: 'Get-Content .\\.env', tool_use_id: 'p1' })).deny).toContain('env-guard')
  expect((await $.tool.call({ tool: 'Bash', command: 'cp .env.example .env', tool_use_id: 'b3' })).deny).toBeUndefined()
  expect((await $.tool.call({ tool: 'Bash', command: 'cat .envrc', tool_use_id: 'b4' })).deny).toBeUndefined()
})

test('refuses an @.env mention in the prompt', async ($, on) => {
  on('prompt.mention', () => ({ type: null }))

  const blocked = await $.prompt.mention({ mention: '.env', path: '/app/.env' })
  expect((blocked as { deny?: string }).deny).toContain('env-guard: /app/.env holds secrets')

  const allowed = await $.prompt.mention({ mention: '.env.example', path: '/app/.env.example' })
  expect((allowed as { deny?: string }).deny).toBeUndefined()
})

test('refuses with the failure text when the check itself fails', async ($, on) => {
  on('tool.call', { tool: 'Read' }, () => ({ result: undefined as never }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state unavailable' }))

  expect((await $.tool.call({ tool: 'Read', file_path: '/app/.env', tool_use_id: 'f-1' })).deny).toBe('env-guard: the check failed, access refused.')
})
