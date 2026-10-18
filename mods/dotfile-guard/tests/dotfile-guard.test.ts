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

const editOf = (file_path: string) =>
  ({ tool: 'Edit', file_path, old_string: 'a', new_string: 'b', tool_use_id: `x-${file_path}` }) as const

test('knows the home in every spelling, in any letter case', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const file_path of [
    '$HOME/.profile',
    '${HOME}/.zshenv',
    '$env:USERPROFILE/.gitconfig',
    '%USERPROFILE%/.bash_profile',
    '/root/.bashrc',
    '/mnt/c/Users/ana/.zprofile',
    '/c/Users/ana/.bash_login',
    'd:/users/ana/.GITCONFIG',
    '~/.BASHRC',
    '$PROFILE',
  ]) {
    expect((await $.tool.call(editOf(file_path))).deny, file_path).toContain('dotfile-guard blocked the edit')
  }
})

test('lets other files of the home and lookalike names through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const file_path of ['~/.ssh/known_hosts', '~/.bashrc.bak', '~/notes/.zshrc', '~/.config/git/config', '/home/ana/.npmrc']) {
    expect((await $.tool.call(editOf(file_path))).deny, file_path).toBeUndefined()
  }
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Write', file_path: '~/.zshrc', content: 'x', tool_use_id: 'es-1' })
  expect(answer.deny).toBe(
    'dotfile-guard bloqueó la edición: ~/.zshrc es un perfil personal de shell o herramienta fuera del proyecto. Si de verdad es intencional, pide al usuario que lo edite a mano.',
  )
})

test('the denial names the path as it was typed', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call(editOf('/home/ana/.gitconfig'))
  expect(answer.deny).toBe(
    'dotfile-guard blocked the edit: /home/ana/.gitconfig is a personal shell or tool profile outside the project. If it really is intended, ask the user to edit it by hand.',
  )
})
