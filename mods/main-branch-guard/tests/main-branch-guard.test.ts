import { expect, test } from 'claude-code/testing'

test('recusa commit na main e libera em branch de feature', async ($, on) => {
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
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  const onMain = await $.tool.call({ tool: 'Bash', command: 'git commit -m "fix"', tool_use_id: 'c1' })
  expect(onMain.deny).toContain('main-branch-guard')

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
