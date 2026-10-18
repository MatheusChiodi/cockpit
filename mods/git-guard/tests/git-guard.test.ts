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

const ANSWER = { result: { stdout: '', stderr: '', interrupted: false } }

test('refuses destructive git and lets the rest through', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })
    expect(answer.deny, command).toContain('git-guard blocked the command')
  }

  for (const command of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })
    expect(answer.deny, command).toBeUndefined()
  }
})

test('refuses destructive git in PowerShell', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'git reset --hard', tool_use_id: 'p-1' })
  expect(answer.deny).toContain('git reset --hard discards local changes')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Bash', command: 'git reset --hard', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('git-guard bloqueou o comando: git reset --hard descarta alterações locais')
})

test('names the reason of each rule', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  const reasons: [string, string][] = [
    ['git push --force origin main', 'git push --force rewrites the remote history (use --force-with-lease)'],
    ['git clean -xdf', 'git clean -f deletes untracked files'],
    ['git restore .', 'discards every change in the directory'],
    ['git merge dev --no-verify', '--no-verify skips the repository hooks'],
    ['git stash clear', 'deletes stashes for good'],
    ['git stash drop stash@{0}', 'deletes stashes for good'],
    ['git branch -D old', 'git branch -D deletes the branch even when unmerged'],
  ]

  for (const [command, why] of reasons) {
    const answer = await $.tool.call({ tool: 'Bash', command, tool_use_id: `r-${command}` })
    expect(answer.deny, command).toBe(`git-guard blocked the command: ${why}. Ask the user to run it by hand if it is intended.`)
  }
})

test('finds the rule in a later segment and leaves look-alikes alone', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  expect((await $.tool.call({ tool: 'Bash', command: 'npm test && git reset --hard', tool_use_id: 's-1' })).deny).toContain('reset --hard')

  for (const command of [
    'git branch -d merged',
    'git stash list',
    'git stash pop',
    'git clean -n',
    'git push --follow-tags',
    'git push origin fix-foo',
    'git checkout ./src',
    'git log --oneline | head -5',
  ]) {
    expect((await $.tool.call({ tool: 'Bash', command, tool_use_id: `a-${command}` })).deny, command).toBeUndefined()
  }

  expect(ran).toBe(8)
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'PowerShell', command: 'git branch -D x', tool_use_id: 'es-1' })
  expect(answer.deny).toBe('git-guard bloqueó el comando: git branch -D borra la rama aunque no esté fusionada. Pide al usuario que lo ejecute a mano si es intencional.')
})
