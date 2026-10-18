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

const submit = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } as const })

test('names the kind of each secret it finds', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const cases: [string, string][] = [
    [`-----BEGIN RSA ${'PRIVATE'} KEY-----\nabc`, 'a private key'],
    [`key sk-ant-${'a1B2'.repeat(6)}`, 'an Anthropic API key'],
    [`key sk-proj-${'a1B2'.repeat(9)}`, 'an API key (sk-...)'],
    [`token ghp_${'a1B2'.repeat(9)}`, 'a GitHub token'],
    [`token github_pat_${'a1B2'.repeat(11)}`, 'a GitHub token'],
    [`token xoxb-${'1234567890'}-abc`, 'a Slack token'],
    [`key AIza${'a1B2c3D4e'.repeat(4).slice(0, 35)}`, 'a Google API key'],
    [`key sk_live_${'a1B2'.repeat(6)}`, 'a Stripe live key'],
  ]

  for (const [text, kind] of cases) {
    const answer = await $.prompt.submit(submit(text))
    expect(answer.drop, kind).toBe(`prompt-secret-guard: the prompt contains ${kind}. Remove the secret and send it again.`)
  }
})

test('lets look-alikes that are too short through', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))

  for (const text of ['AKIA1234', 'sk-short', 'ghp_abc', 'my sk_test_key is fine', 'xoxb-1']) {
    const answer = await $.prompt.submit(submit(text))
    expect(answer.drop, text).toBeUndefined()
    expect(answer.text).toBe(text)
  }
})

test('speaks Spanish when the hub language is es', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.prompt.submit(submit(`token ghp_${'a1B2'.repeat(9)}`))
  expect(answer.drop).toBe('prompt-secret-guard: el prompt contiene un token de GitHub. Quita el secreto y envíalo de nuevo.')
})

