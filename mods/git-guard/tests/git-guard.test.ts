import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  'git push --force origin main',
  'git push -f',
  'git reset --hard HEAD~3',
  'git clean -fd',
  'git commit -m x --no-verify',
  'git checkout -- .',
  'git branch -D feature',
]

const ALLOWED = [
  'git push --force-with-lease',
  'git push origin feat/login',
  'git reset --soft HEAD~1',
  'git status',
  'git checkout -- src/a.ts',
]

test('recusa git destrutivo e libera o resto', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('git-guard')
  }

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }
})
