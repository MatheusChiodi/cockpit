import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses commit on main and lets feature branches through', async ($, on) => {
  let branch = 'main'
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: `${branch}\n`,
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const onMain = await $.tool.call({ tool: 'Bash', command: 'git commit -m "fix"', tool_use_id: 'c1' })
  expect(onMain.deny).toContain('main-branch-guard: you are on "main". Create a branch')

  const creating = await $.tool.call({
    tool: 'Bash',
    command: 'git switch -c feat/x && git commit -m "fix"',
    tool_use_id: 'c2',
  })
  expect(creating.deny).toBeUndefined()

  const reading = await $.tool.call({ tool: 'Bash', command: 'git status', tool_use_id: 'c3' })
  expect(reading.deny).toBeUndefined()

  branch = 'feat/login'
  const onFeature = await $.tool.call({ tool: 'Bash', command: 'git commit -m "fix"', tool_use_id: 'c4' })
  expect(onFeature.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('process.run', () => ({
    value: { exitCode: 0, stdout: 'main\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git commit -m "fix"', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('main-branch-guard: você está em "main". Crie uma branch')
})

const head = (branch: string, exitCode = 0) => ({
  value: { exitCode, stdout: `${branch}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('process.run', () => head('master'))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git push', tool_use_id: 'es-1' })
  expect(answer.deny).toBe('main-branch-guard: estás en "master". Crea una rama (git switch -c <nombre>) antes de commit/push/merge.')
})

test('guards every protected name and every history-writing verb', async ($, on) => {
  const at = { branch: 'main' }
  on('process.run', () => head(at.branch))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  let n = 0
  for (const branch of ['main', 'master', 'production', 'prod']) {
    at.branch = branch

    for (const verb of ['commit -m x', 'push origin HEAD', 'merge feat', 'rebase main', 'cherry-pick abc', 'revert HEAD']) {
      const answer = await $.tool.call({ tool: 'Bash', command: `git ${verb}`, tool_use_id: `v${(n += 1)}` })
      expect(answer.deny, `${branch}: ${verb}`).toContain(`you are on "${branch}"`)
    }
  }

  at.branch = 'main-old'
  expect((await $.tool.call({ tool: 'Bash', command: 'git push', tool_use_id: 'v-x' })).deny).toBeUndefined()
})

test('lets checkout -b through and guards PowerShell too', async ($, on) => {
  on('process.run', () => head('main'))
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER as never)

  const creating = await $.tool.call({ tool: 'Bash', command: 'git checkout -b fix/x; git commit -m y', tool_use_id: 'k1' })
  expect(creating.deny).toBeUndefined()

  const ps = await $.tool.call({ tool: 'PowerShell', command: 'git merge feature', tool_use_id: 'k2' })
  expect(ps.deny).toContain('you are on "main"')
})

test('lets the command through outside a repository', async ($, on) => {
  let ran = 0
  on('process.run', () => head('', 128))
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  expect((await $.tool.call({ tool: 'Bash', command: 'git commit -m x', tool_use_id: 'o1' })).deny).toBeUndefined()
  expect(ran).toBe(1)
})

test('refuses with the fallback reason when git cannot be run', async ($, on) => {
  on('process.run', () => {
    throw new Error('spawn git ENOENT')
  })
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Bash', command: 'git push', tool_use_id: 'f1' })
  expect(answer.deny).toBe('main-branch-guard: the check failed, command refused.')
})
