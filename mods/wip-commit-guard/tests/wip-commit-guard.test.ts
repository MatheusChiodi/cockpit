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

const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: `b-${command}` })

test('reads --message and the case and trailing punctuation of the message', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)

  for (const command of ['git commit --message="changes"', 'git commit --message tmp', 'git commit -m "WIP!!!"', 'git commit -m "  stuff  "', 'git commit -m xxxx']) {
    expect((await bash($, command)).deny, command).toContain('wip-commit-guard refused the commit')
  }

  for (const command of ['git commit -m "fixed typo in README"', 'git commit -m "test: cover the empty cart"', 'git commit -m "wip: draft the parser"']) {
    expect((await bash($, command)).deny, command).toBeUndefined()
  }
})

test('quotes the message and never runs a refused commit', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1

    return ANSWER
  })

  expect((await bash($, 'git commit -m "save"')).deny).toBe(
    'wip-commit-guard refused the commit: "save" says nothing about the change. Write a message that says what changed and why.',
  )
  expect(ran).toBe(0)
})

test('refuses throwaway messages in PowerShell too', async ($, on) => {
  on('tool.call', { tool: 'PowerShell' }, () => ANSWER)

  const refused = await $.tool.call({ tool: 'PowerShell', command: "git commit -m 'wip'", tool_use_id: 'ps-1' })
  expect(refused.deny).toContain('"wip"')

  const allowed = await $.tool.call({ tool: 'PowerShell', command: 'git commit -m "add retry to the upload"', tool_use_id: 'ps-2' })
  expect(allowed.deny).toBeUndefined()
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  expect((await bash($, 'git commit -m "update"')).deny).toBe(
    'wip-commit-guard rechazó el commit: "update" no dice nada sobre el cambio. Escribe un mensaje que diga qué cambió y por qué.',
  )
})
