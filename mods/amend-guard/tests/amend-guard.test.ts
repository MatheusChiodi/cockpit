import { expect, test } from 'claude-code/testing'

const done = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('asks before amending or rebasing a commit that is already pushed', async ($, on) => {
  let remotes = '  origin/feat/login\n'
  on('process.run', () => done(remotes))
  on('tool.check', () => ({ decision: 'allow' }))

  const amend = await $.tool.check({ tool: 'Bash', input: { command: 'git commit --amend --no-edit' } })
  expect(amend.decision).toBe('ask')
  expect(amend.reason).toContain('git commit --amend rewrites commits already on origin/feat/login')

  const rebase = await $.tool.check({ tool: 'Bash', input: { command: 'git rebase origin/main' } })
  expect(rebase.decision).toBe('ask')

  const continuing = await $.tool.check({ tool: 'Bash', input: { command: 'git rebase --continue' } })
  expect(continuing.decision).toBe('allow')

  const plain = await $.tool.check({ tool: 'Bash', input: { command: 'git commit -m "x"' } })
  expect(plain.decision).toBe('allow')

  remotes = ''
  const local = await $.tool.check({ tool: 'Bash', input: { command: 'git commit --amend' } })
  expect(local.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('process.run', () => done('  origin/main\n'))
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git commit --amend' } })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => done('  origin/main\n'))
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git rebase main' } })
  expect(verdict.reason).toContain('reescreve commits que já estão em origin/main')
})
