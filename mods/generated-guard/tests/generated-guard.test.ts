import { expect, test } from 'claude-code/testing'

const BLOCKED = ['node_modules/react/index.js', 'C:\\project\\dist\\main.js', 'web/.next/server/app.js', '.git/config']

const ALLOWED = ['src/build/index.ts', 'src/distribution.ts', 'outline.md']

const edit = (file_path: string, id: string) => ({
  tool: 'Edit' as const,
  file_path,
  old_string: 'a',
  new_string: 'b',
  tool_use_id: id,
})

test('refuses editing generated folders and lets source code through', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  for (const file_path of BLOCKED) {
    const answer = await $.tool.call(edit(file_path, `e-${file_path}`))
    expect(answer.deny, file_path).toContain('is in a generated or dependency folder')
  }

  for (const file_path of ALLOWED) {
    const answer = await $.tool.call(edit(file_path, `ok-${file_path}`))
    expect(answer.deny, file_path).toBeUndefined()
  }
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call(edit('node_modules/react/index.js', 'pt-1'))
  expect(answer.deny).toContain(
    'generated-guard: node_modules/react/index.js fica em pasta gerada ou de dependências',
  )
})
