import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Write', input: { file_path: 'deploy.sh', content: 'chmod 777 /var/app/uploads' } },
  { tool: 'Edit', input: { file_path: 'Dockerfile', old_string: '', new_string: 'RUN chmod -R a+rwx /data' } },
  { tool: 'Write', input: { file_path: 'setup.py', content: 'os.chmod(path, 0o777)' } },
  { tool: 'Edit', input: { file_path: 'src/fs.js', old_string: '', new_string: 'fs.chmodSync(file, 0o666)' } },
  { tool: 'Write', input: { file_path: 'init.sh', content: 'umask 000' } },
  { tool: 'Edit', input: { file_path: 'perm.ps1', old_string: '', new_string: 'icacls C:\\data /grant Everyone:(OI)(CI)F' } },
]

const FINE: readonly Call[] = [
  { tool: 'Write', input: { file_path: 'deploy.sh', content: 'chmod 755 deploy.sh' } },
  { tool: 'Write', input: { file_path: 'deploy.sh', content: 'chmod +x run.sh' } },
  { tool: 'Write', input: { file_path: 'deploy.sh', content: 'chmod 600 ~/.ssh/id_ed25519' } },
  { tool: 'Write', input: { file_path: 'deploy.sh', content: 'chmod u+w file' } },
  { tool: 'Write', input: { file_path: 'deploy.sh', content: 'chmod 1777 /tmp/cache' } },
  { tool: 'Write', input: { file_path: 'deploy.sh', content: 'chmod -R 644 dist' } },
  { tool: 'Write', input: { file_path: 'setup.py', content: 'os.chmod(path, 0o755)' } },
  { tool: 'Write', input: { file_path: 'init.sh', content: 'umask 022' } },
  { tool: 'Edit', input: { file_path: 'perm.ps1', old_string: '', new_string: 'icacls C:\\data /grant Users:(R)' } },
  { tool: 'Write', input: { file_path: 'docs/hardening.md', content: 'chmod 777 /var/app/uploads' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('script-mode-guard:')
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
    input: { file_path: 'deploy.sh', old_string: 'chmod 777 /var/app/uploads', new_string: 'chmod 777 /var/app/uploads\necho done' },
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
  expect(verdict.reason).toContain('afrouxa permissões de arquivo em deploy.sh')
})

test('catches symbolic modes, string modes and umask 0', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const input of [
    { file_path: 'deploy.sh', content: 'chmod o+w shared.log' },
    { file_path: 'src/fs.ts', content: 'await chmod(file, "666")' },
    { file_path: 'entry.sh', content: 'umask 0\nexec app' },
  ]) {
    const verdict = await $.tool.check({ tool: 'Write', input })
    expect(verdict.decision, input.content).toBe('ask')
    expect(verdict.reason, input.content).toContain(`loosens file permissions in ${input.file_path}`)
  }
})

test('skips commented lines, tests, examples and other tools', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const input of [
    { file_path: 'deploy.sh', content: '# chmod 777 /var/app' },
    { file_path: 'src/fs.test.ts', content: 'fs.chmodSync(f, 0o777)' },
    { file_path: 'examples/setup.sh', content: 'chmod 777 x' },
    { file_path: 'deploy.sh.example', content: 'chmod 777 x' },
  ]) {
    expect((await $.tool.check({ tool: 'Write', input })).decision, input.file_path).toBe('allow')
  }

  expect((await $.tool.check({ tool: 'Bash', input: { command: 'chmod 777 x' } })).decision).toBe('allow')
})

test('keeps an ask already made beneath with its own reason', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.reason).toBe('asked beneath')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Write', input: { file_path: 'init.sh', content: 'umask 000' } })
  expect(verdict.reason).toContain('afloja permisos de archivo en init.sh')
})
