import { expect, test } from 'claude-code/testing'

test('recusa editar lockfiles e libera o package.json', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  for (const file_path of ['package-lock.json', 'web/yarn.lock', 'C:\\app\\pnpm-lock.yaml', 'Cargo.lock']) {
    const answer = await $.tool.call({
      tool: 'Edit',
      file_path,
      old_string: 'a',
      new_string: 'b',
      tool_use_id: `e-${file_path}`,
    })
    expect(answer.deny, file_path).toContain('lockfile-guard')
  }

  const manifest = await $.tool.call({
    tool: 'Edit',
    file_path: 'package.json',
    old_string: 'a',
    new_string: 'b',
    tool_use_id: 'e-ok',
  })
  expect(manifest.deny).toBeUndefined()
})
