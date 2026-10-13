import { expect, test } from 'claude-code/testing'

const BLOCKED = ['node_modules/react/index.js', 'C:\\projeto\\dist\\main.js', 'web/.next/server/app.js', '.git/config']

const ALLOWED = ['src/build/index.ts', 'src/distribution.ts', 'outline.md']

test('recusa editar pastas geradas e libera o código-fonte', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  for (const file_path of BLOCKED) {
    const answer = await $.tool.call({
      tool: 'Edit',
      file_path,
      old_string: 'a',
      new_string: 'b',
      tool_use_id: `e-${file_path}`,
    })
    expect(answer.deny, file_path).toContain('generated-guard')
  }

  for (const file_path of ALLOWED) {
    const answer = await $.tool.call({
      tool: 'Edit',
      file_path,
      old_string: 'a',
      new_string: 'b',
      tool_use_id: `ok-${file_path}`,
    })
    expect(answer.deny, file_path).toBeUndefined()
  }
})
