import { expect, test } from 'claude-code/testing'

// Built at run time so the test file holds no literal secret.
const TOKEN = `ghp_${'a1B2'.repeat(9)}`
const KEY = `-----BEGIN ${'RSA PRIVATE KEY'}-----`

test('refuses writing secrets and lets ordinary code through', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  const written = await $.tool.call({
    tool: 'Write',
    file_path: 'src/config.ts',
    content: `const token = "${TOKEN}"`,
    tool_use_id: 'w1',
  })
  expect(written.deny).toContain('secret-scan: the content for src/config.ts contains a GitHub token')

  const edited = await $.tool.call({
    tool: 'Edit',
    file_path: 'id_rsa',
    old_string: 'x',
    new_string: KEY,
    tool_use_id: 'e1',
  })
  expect(edited.deny).toContain('a private key')

  const clean = await $.tool.call({
    tool: 'Write',
    file_path: 'src/config.ts',
    content: 'const token = process.env.TOKEN',
    tool_use_id: 'w2',
  })
  expect(clean.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({
    tool: 'Write',
    file_path: 'src/config.ts',
    content: `const token = "${TOKEN}"`,
    tool_use_id: 'pt-1',
  })
  expect(answer.deny).toContain('secret-scan: o conteúdo para src/config.ts contém token do GitHub')
})
