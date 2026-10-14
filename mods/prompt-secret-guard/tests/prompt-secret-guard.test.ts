import { expect, test } from 'claude-code/testing'

// Built at run time so the test file holds no literal secret.
const KEY = `AKIA${'ABCDEFGHIJKLMNOP'}`

test('drops a prompt holding a secret and lets the rest through', async ($, on) => {
  let entered = 0
  on('prompt.submit', ($, e) => {
    entered += 1

    return { text: e.text }
  })

  const blocked = await $.prompt.submit({
    text: `why does it fail? key=${KEY}`,
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(blocked.drop).toContain('prompt-secret-guard: the prompt contains an AWS access key')
  expect(entered).toBe(0)

  const allowed = await $.prompt.submit({
    text: 'why does the deploy fail?',
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(allowed.drop).toBeUndefined()
  expect(allowed.text).toBe('why does the deploy fail?')
})

test('speaks the language set in the hub', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const blocked = await $.prompt.submit({
    text: `por que falha? key=${KEY}`,
    wait: false,
    origin: { kind: 'composer' },
  })
  expect(blocked.drop).toContain('prompt-secret-guard: o prompt contém chave de acesso AWS')
})
