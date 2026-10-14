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
