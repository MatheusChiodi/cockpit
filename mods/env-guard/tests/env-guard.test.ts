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
