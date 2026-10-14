import { expect, test } from 'claude-code/testing'

test('expands ::fix and keeps the rest of the prompt', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const entered = await $.prompt.submit({
    text: '::fix TypeError in login.ts',
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(entered.text).toContain('root cause')
  expect(entered.text).toContain('TypeError in login.ts')
})

test('leaves a plain prompt and an unknown shortcut alone', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  for (const text of ['how do I rebase?', '::nothing here']) {
    const entered = await $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
    expect(entered.text).toBe(text)
  }
})
