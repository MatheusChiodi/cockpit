import { expect, test } from 'claude-code/testing'

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

const REFUSED = [
  'git commit -m "wip"',
  "git commit -am 'fix'",
  'git commit -m asdf',
  'git commit -m "."',
  'git add . && git commit -m "Update"',
]
const ALLOWED = [
  'git commit -m "fix login redirect loop"',
  'git commit',
  'git commit --amend --no-edit',
  'git status',
  'echo wip',
]

test('refuses throwaway commit messages and lets real ones through', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of REFUSED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: 'r' })
    expect(answer.deny, command).toContain('wip-commit-guard refused the commit')
  }

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: 'a' })
    expect(answer.deny, command).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git commit -m "wip"', tool_use_id: 'pt' })
  expect(answer.deny).toContain('recusou o commit')
})
