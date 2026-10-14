import { expect, test } from 'claude-code/testing'

const BLOCKED = [
  '~/.bashrc',
  '/home/ana/.zshrc',
  '/Users/ana/.ssh/config',
  'C:\\Users\\ana\\.gitconfig',
  'C:\\Users\\ana\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1',
  'C:\\Users\\ana\\Documents\\WindowsPowerShell\\profile.ps1',
]

const ALLOWED = ['/home/ana/proj/.bashrc', '.zshrc', 'C:\\Users\\ana\\proj\\.gitconfig', 'src/index.ts', 'scripts/profile.ps1']

const ANSWER = { result: undefined as never }

test('refuses edits and writes on the personal profiles', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Edit' }, () => {
    ran += 1

    return ANSWER
  })
  on('tool.call', { tool: 'Write' }, () => {
    ran += 1

    return ANSWER
  })

  for (const file_path of BLOCKED) {
    const edit = await $.tool.call({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b', tool_use_id: `e-${file_path}` })
    expect(edit.deny, file_path).toContain('dotfile-guard blocked the edit')

    const write = await $.tool.call({ tool: 'Write', file_path, content: 'x', tool_use_id: `w-${file_path}` })
    expect(write.deny, file_path).toContain('dotfile-guard')
  }

  expect(ran).toBe(0)
})

test('lets a dotfile inside the project and ordinary files through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const file_path of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b', tool_use_id: `a-${file_path}` })
    expect(answer.deny, file_path).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Edit', file_path: '~/.bashrc', old_string: 'a', new_string: 'b', tool_use_id: 'pt-1' })
  expect(answer.deny).toContain('dotfile-guard bloqueou a edição: ~/.bashrc')
})
