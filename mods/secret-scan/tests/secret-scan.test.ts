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

// Each kind, built at run time.
const KINDS: readonly [string, string][] = [
  [`AKIA${'ABCD'.repeat(4)}`, 'an AWS access key'],
  [`sk-ant-${'x9'.repeat(15)}`, 'an Anthropic API key'],
  [`sk-proj-${'Ab3'.repeat(12)}`, 'an API key (sk-...)'],
  [`github_pat_${'Z1'.repeat(21)}`, 'a GitHub token'],
  [`xoxb-${'12345'.repeat(3)}`, 'a Slack token'],
  [`AIza${'q'.repeat(35)}`, 'a Google API key'],
  [`sk_live_${'m4'.repeat(12)}`, 'a Stripe live key'],
  [`-----BEGIN ${'OPENSSH PRIVATE KEY'}-----`, 'a private key'],
]

test('names each kind of secret and never runs the write', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Write' }, () => {
    ran += 1

    return { result: undefined as never }
  })

  for (const [secret, kind] of KINDS) {
    const answer = await $.tool.call({ tool: 'Write', file_path: '.env.local', content: `X=${secret}`, tool_use_id: `k-${kind}` })
    expect(answer.deny, kind).toContain(`contains ${kind}.`)
  }

  expect(ran).toBe(0)
})

test('lets look-alikes through', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ({ result: undefined as never }))

  for (const content of ['AKIA1234', 'sk-short', 'ghp_tooShort', 'const pk = "-----BEGIN PUBLIC KEY-----"', 'sk_test_' + 'a'.repeat(30)]) {
    expect((await $.tool.call({ tool: 'Write', file_path: 'a.ts', content, tool_use_id: `l-${content}` })).deny, content).toBeUndefined()
  }
})

test('an Edit is judged by its new text only', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))

  const removing = await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: `t = "${TOKEN}"`, new_string: 't = env.T', tool_use_id: 'e1' })
  expect(removing.deny).toBeUndefined()
})

test('speaks Spanish from the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ({ result: undefined as never }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const answer = await $.tool.call({ tool: 'Edit', file_path: 'k.pem', old_string: 'x', new_string: KEY, tool_use_id: 'es-1' })
  expect(answer.deny).toBe(
    'secret-scan: el contenido para k.pem contiene una clave privada. Usa una variable de entorno en lugar de guardar el secreto en el archivo.',
  )
})
