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

const check = async ($: any, content: string, file_path = 'src/net.ts') =>
  $.tool.check({ tool: 'Write', input: { file_path, content } })

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await check($, 'const url = "https://billing.corp/api"')
  expect(verdict.reason).toBe(
    'private-host-guard: agrega un hostname interno en src/net.ts. Revela la red interna y falla en cualquier otro entorno; lee la dirección de la configuración o de una variable de entorno.',
  )
})

test('keeps to the edges of the 172.16/12 block', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const ip of ['172.16.0.1', '172.31.255.1']) {
    expect((await check($, `host = "${ip}"`)).decision, ip).toBe('ask')
  }

  for (const ip of ['172.15.0.1', '172.32.0.1', '192.169.1.1', '11.0.0.1']) {
    expect((await check($, `host = "${ip}"`)).decision, ip).toBe('allow')
  }
})

test('catches internal hostnames with credentials, ports and other suffixes', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const url of ['postgres://app:pw@db.internal:5432/app', 'http://nas.lan', 'https://printer.home.arpa/ui', 'ldap://dc1.intranet']) {
    const verdict = await check($, `url = "${url}"`)
    expect(verdict.decision, url).toBe('ask')
    expect(verdict.reason, url).toContain('adds an internal hostname to src/net.ts')
  }

  expect((await check($, 'url = "https://corp.example.com"')).decision).toBe('allow')
})

test('lets tests, fixtures and examples through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const file_path of ['tests/net.ts', 'src/net.spec.ts', '__tests__/a.js', 'fixtures/hosts.json', 'examples/app.ts', '.env.example']) {
    expect((await check($, 'host = "10.0.0.5"', file_path)).decision, file_path).toBe('allow')
  }
})

test('ignores tools that do not write files', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await $.tool.check({ tool: 'Bash', input: { command: 'ping 10.0.0.1' } })).decision).toBe('allow')
})
