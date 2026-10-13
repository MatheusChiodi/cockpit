import { expect, test } from 'claude-code/testing'

test('expande ::fix e preserva o resto do prompt', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const entered = await $.prompt.submit({
    text: '::fix TypeError em login.ts',
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(entered.text).toContain('causa raiz')
  expect(entered.text).toContain('TypeError em login.ts')
})

test('não mexe em prompt comum nem em atalho desconhecido', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  for (const text of ['como faço um rebase?', '::nada aqui']) {
    const entered = await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
    expect(entered.text).toBe(text)
  }
})
