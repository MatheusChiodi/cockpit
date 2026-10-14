import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/api.ts', old_string: '', new_string: 'const base = \'http://192.168.1.20:8080/api\'' } },
  { tool: 'Write', input: { file_path: 'config.yml', content: 'host: 10.0.4.17' } },
  { tool: 'Edit', input: { file_path: 'src/billing.ts', old_string: '', new_string: 'const url = "https://billing.corp/api"' } },
  { tool: 'Edit', input: { file_path: 'src/db.ts', old_string: '', new_string: 'const host = "172.20.3.9"' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/api.ts', old_string: '', new_string: 'const base = \'http://localhost:3000\'' } },
  { tool: 'Edit', input: { file_path: 'src/api.ts', old_string: '', new_string: 'const base = \'http://127.0.0.1:8080\'' } },
  { tool: 'Edit', input: { file_path: 'src/server.ts', old_string: '', new_string: 'server.listen(3000, \'0.0.0.0\')' } },
  { tool: 'Edit', input: { file_path: 'src/api.ts', old_string: '', new_string: 'const base = "https://api.example.com"' } },
  { tool: 'Edit', input: { file_path: 'src/api.ts', old_string: '', new_string: 'const base = "https://api.internal.example.com/v1"' } },
  { tool: 'Edit', input: { file_path: 'infra/net.tf', old_string: '', new_string: 'cidr = "192.168.1.0/24"' } },
  { tool: 'Edit', input: { file_path: 'src/db.ts', old_string: '', new_string: '// the database lives at 10.0.0.5' } },
  { tool: 'Edit', input: { file_path: 'src/version.ts', old_string: '', new_string: 'const v = "10.2.3.4.5"' } },
  { tool: 'Write', input: { file_path: 'docs/network.md', content: 'host: 10.0.4.17' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('private-host-guard:')
  }
})

test('lets similar but legitimate work through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of FINE) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('allow')
  }
})

test('counts only what the edit adds', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'src/api.ts', old_string: 'const base = \'http://192.168.1.20:8080/api\'', new_string: 'const base = \'http://192.168.1.20:8080/api\'\nconst timeout = 30' },
  })
  expect(verdict.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('adiciona um endereço IP privado em src/api.ts')
})
