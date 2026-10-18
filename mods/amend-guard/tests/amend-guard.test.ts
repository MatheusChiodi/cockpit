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

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', () => done('  origin/main\n'))
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'PowerShell', input: { command: 'git commit --amend -m "fix"' } })
  expect(verdict.reason).toBe(
    'amend-guard: git commit --amend reescribe commits que ya están en origin/main; el push exigirá --force. Confirma antes de ejecutar.',
  )
})

test('skips the symbolic origin/HEAD line and a git that fails', async ($, on) => {
  const git = { stdout: '  origin/HEAD -> origin/main\n', exitCode: 0 }
  on('process.run', () => done(git.stdout, git.exitCode))
  on('tool.check', () => ({ decision: 'allow' }))

  expect((await $.tool.check({ tool: 'Bash', input: { command: 'git commit --amend' } })).decision).toBe('allow')

  git.stdout = '  origin/main\n'
  git.exitCode = 128
  expect((await $.tool.check({ tool: 'Bash', input: { command: 'git commit --amend' } })).decision).toBe('allow')
})

test('lets rebase --abort, --skip and --quit through, and other tools', async ($, on) => {
  let looked = 0
  on('process.run', () => {
    looked += 1

    return done('  origin/main\n')
  })
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ['git rebase --abort', 'git rebase --skip', 'git rebase --quit', 'git status && git log']) {
    expect((await $.tool.check({ tool: 'Bash', input: { command } })).decision, command).toBe('allow')
  }

  expect((await $.tool.check({ tool: 'Write', input: { file_path: 'a', content: 'git commit --amend' } })).decision).toBe('allow')
  expect(looked).toBe(0)
})

test('asks with the fallback reason when git cannot be run', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'git rebase -i HEAD~3' } })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toBe('amend-guard: the check failed, confirm before running.')
})
