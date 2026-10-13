import { expect, test } from 'claude-code/testing'

// Montada em runtime para o arquivo de teste não carregar um segredo literal.
const KEY = `AKIA${'ABCDEFGHIJKLMNOP'}`

test('barra prompt com segredo e deixa passar o resto', async ($, on) => {
  let entered = 0
  on('prompt.submit', ($, e) => {
    entered += 1

    return { text: e.text }
  })

  const blocked = await $.prompt.submit({
    text: `por que falha? key=${KEY}`,
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(blocked.drop).toContain('chave de acesso AWS')
  expect(entered).toBe(0)

  const allowed = await $.prompt.submit({
    text: 'por que o deploy falha?',
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(allowed.drop).toBeUndefined()
  expect(allowed.text).toBe('por que o deploy falha?')
})
