import { expect, test } from 'claude-code/testing'

const edit = (new_string: string, old_string: string, file_path = '.gitignore') => ({
  tool: 'Edit',
  input: { file_path, old_string, new_string },
})

test('asks when an edit drops a secret entry or negates one', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const dropped = await $.tool.check(edit('node_modules\n', '.env\nnode_modules\n'))
  expect(dropped.decision).toBe('ask')
  expect(dropped.reason).toContain('removes .env from .gitignore')

  const pem = await $.tool.check(edit('dist\n', '*.pem\ndist\n', 'sub/.gitignore'))
  expect(pem.decision).toBe('ask')

  const negated = await $.tool.check(edit('.env*\n!.env\n', '.env*\n'))
  expect(negated.decision).toBe('ask')
  expect(negated.reason).toContain('!.env')
})

test('compares a Write against the file on disk', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('fs.read', () => ({ value: '.env\n*.key\nnode_modules\n' }))

  const verdict = await $.tool.check({
    tool: 'Write',
    input: { file_path: '.gitignore', content: 'node_modules\n' },
  })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('.env, *.key')

  const kept = await $.tool.check({
    tool: 'Write',
    input: { file_path: '.gitignore', content: '.env\n*.key\nnode_modules\ndist\n' },
  })
  expect(kept.decision).toBe('allow')
})

test('asks before a forced add of a secret-bearing file', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ['git add -f .env', 'git add --force certs/server.pem', 'git add .env.production -f']) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('gitignore-guard:')
  }
})

test('lets ordinary .gitignore and git add work through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const calls = [
    edit('node_modules\ndist\n', 'node_modules\n'),
    edit('node_modules\n', 'node_modules\ndist\n'),
    edit('.env\n', '.env\n.env.example\n'),
    edit('.env\n!.env.example\n', '.env\n'),
    edit('.env.local\n', '.env.local\n', 'README.md'),
    { tool: 'Bash', input: { command: 'git add -f dist/index.js' } },
    { tool: 'Bash', input: { command: 'git add .env.example' } },
    { tool: 'Bash', input: { command: 'git add src/app.ts' } },
  ]

  for (const call of calls) {
    const verdict = await $.tool.check(call)
    expect(verdict.decision, JSON.stringify(call.input)).toBe('allow')
  }
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const verdict = await $.tool.check(edit('node_modules\n', '.env\nnode_modules\n'))
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check(edit('node_modules\n', '.env\nnode_modules\n'))
  expect(verdict.reason).toContain('gitignore-guard: remove .env de .gitignore')
})

test('asks for other secret entries: keys, cloud folders and state files', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const entry of ['id_rsa', '.npmrc', '.aws/', 'terraform.tfstate', 'credentials.json', 'secrets/', '**/.env.local', '/.env']) {
    const verdict = await $.tool.check(edit('dist\n', `${entry}\ndist\n`))
    expect(verdict.decision, entry).toBe('ask')
    expect(verdict.reason, entry).toContain(`removes ${entry} from .gitignore`)
  }
})

test('names at most three of the entries it would remove', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check(edit('dist\n', '.env\n*.pem\n*.key\n.npmrc\ndist\n'))
  expect(verdict.reason).toContain('removes .env, *.pem, *.key from')
  expect(verdict.reason).not.toContain('.npmrc')
})

test('a Write of a new .gitignore that cannot be read compares against nothing', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('fs.read', () => ({ deny: 'ENOENT' }) as never)

  const fresh = await $.tool.check({ tool: 'Write', input: { file_path: '.gitignore', content: 'node_modules\n.env\n' } })
  expect(fresh.decision).toBe('allow')

  const negated = await $.tool.check({ tool: 'Write', input: { file_path: '.gitignore', content: '!.env\n' } })
  expect(negated.decision).toBe('ask')
})

test('asks for a forced add in PowerShell and of a private key', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const shell = await $.tool.check({ tool: 'PowerShell', input: { command: 'git add --force .npmrc' } })
  expect(shell.decision).toBe('ask')
  expect(shell.reason).toContain('force-adds .npmrc past .gitignore (git add --force .npmrc)')

  const key = await $.tool.check({ tool: 'Bash', input: { command: 'git add -f ~/.ssh/id_ed25519' } })
  expect(key.decision).toBe('ask')

  const later = await $.tool.check({ tool: 'Bash', input: { command: 'git add .env.example && git commit -f' } })
  expect(later.decision).toBe('allow')
})

test('leaves other tools and an ask beneath alone', async ($, on) => {
  let decision: 'allow' | 'ask' = 'allow'
  on('tool.check', () => (decision === 'ask' ? { decision, reason: 'asked beneath' } : { decision }))

  const read = await $.tool.check({ tool: 'Read', input: { file_path: '.gitignore' } })
  expect(read.decision).toBe('allow')

  decision = 'ask'
  const beneath = await $.tool.check(edit('node_modules\n', '.env\nnode_modules\n'))
  expect(beneath.reason).toBe('asked beneath')
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const removed = await $.tool.check(edit('node_modules\n', '.env\nnode_modules\n'))
  expect(removed.reason).toContain('gitignore-guard: quita .env de .gitignore')

  const forced = await $.tool.check({ tool: 'Bash', input: { command: 'git add -f .env' } })
  expect(forced.reason).toContain('gitignore-guard: fuerza .env dentro del commit')
})
