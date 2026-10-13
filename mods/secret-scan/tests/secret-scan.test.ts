import { expect, test } from 'claude-code/testing'

// Montados em runtime para o arquivo de teste não carregar um segredo literal.
const TOKEN = `ghp_${'a1B2'.repeat(9)}`
const KEY = `-----BEGIN ${'RSA PRIVATE KEY'}-----`

test('recusa gravar segredos e libera código comum', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  const written = await $.tool.call({
    tool: 'Write',
    file_path: 'src/config.ts',
    content: `const token = "${TOKEN}"`,
    tool_use_id: 'w1',
  })
  expect(written.deny).toContain('token do GitHub')

  const edited = await $.tool.call({
    tool: 'Edit',
    file_path: 'id_rsa',
    old_string: 'x',
    new_string: KEY,
    tool_use_id: 'e1',
  })
  expect(edited.deny).toContain('chave privada')

  const clean = await $.tool.call({
    tool: 'Write',
    file_path: 'src/config.ts',
    content: 'const token = process.env.TOKEN',
    tool_use_id: 'w2',
  })
  expect(clean.deny).toBeUndefined()
})
