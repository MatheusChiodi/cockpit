import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/auth.ts', old_string: '', new_string: 'const hash = crypto.createHash(\'md5\').update(password).digest(\'hex\')' } },
  { tool: 'Write', input: { file_path: 'src/Auth.java', content: 'String passwordHash = DigestUtils.md5Hex(password);' } },
  { tool: 'Edit', input: { file_path: 'src/reset.ts', old_string: '', new_string: 'const resetToken = Math.random().toString(36).slice(2)' } },
  { tool: 'Write', input: { file_path: 'crypto.py', content: 'cipher = AES.new(key, AES.MODE_ECB)' } },
  { tool: 'Edit', input: { file_path: 'src/auth.ts', old_string: '', new_string: 'jwt.verify(token, key, { algorithms: [\'none\'] })' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/auth.ts', old_string: '', new_string: 'const hash = crypto.createHash(\'sha256\').update(password).digest(\'hex\')' } },
  { tool: 'Edit', input: { file_path: 'src/http.ts', old_string: '', new_string: 'const etag = crypto.createHash(\'md5\').update(body).digest(\'hex\')' } },
  { tool: 'Edit', input: { file_path: 'src/auth.ts', old_string: '', new_string: 'const hash = await bcrypt.hash(password, 12)' } },
  { tool: 'Edit', input: { file_path: 'src/retry.ts', old_string: '', new_string: 'const delay = Math.random() * 1000' } },
  { tool: 'Edit', input: { file_path: 'src/id.ts', old_string: '', new_string: 'const id = crypto.randomBytes(16).toString(\'hex\')' } },
  { tool: 'Write', input: { file_path: 'src/Enc.java', content: 'Cipher.getInstance("AES/GCM/NoPadding");' } },
  { tool: 'Edit', input: { file_path: 'src/auth.ts', old_string: '', new_string: 'jwt.verify(token, key, { algorithms: [\'HS256\'] })' } },
  { tool: 'Write', input: { file_path: 'retry.py', content: 'jitter = random.random() * retry_delay' } },
  { tool: 'Edit', input: { file_path: 'src/stats.ts', old_string: '', new_string: 'const tokenCount = items.length' } },
  { tool: 'Edit', input: { file_path: 'src/auth.test.ts', old_string: '', new_string: 'const resetToken = Math.random().toString(36)' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('weak-crypto-guard:')
  }
})

test('lets similar but legitimate work through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of FINE) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('allow')
  }
})

test('counts only what the edit adds', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({
    tool: 'Edit',
    input: { file_path: 'src/reset.ts', old_string: 'const resetToken = Math.random().toString(36).slice(2)', new_string: 'const resetToken = Math.random().toString(36).slice(2)\nconst ttl = 600' },
  })
  expect(verdict.decision).toBe('allow')
})

test('does not loosen a verdict that is already a deny', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'blocked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('deny')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('faz hash de senha ou segredo com MD5 ou SHA-1 em src/auth.ts')
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const { tool, input } = ASKED[3] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.reason).toBe(
    'weak-crypto-guard: elige un cifrado débil o el modo ECB en crypto.py. Los patrones de los datos se ven en el resultado; usa AES-GCM.',
  )
})

test('gives the reason of the rule that matched', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  const reason = async (tool: string, input: Record<string, string>) => (await $.tool.check({ tool, input })).reason

  expect(await reason('Write', { file_path: 'a.py', content: 'digest = hashlib.sha1(secret.encode()).hexdigest()' })).toContain(
    'hashes a password or secret with MD5 or SHA-1 in a.py',
  )
  expect(await reason('Write', { file_path: 'a.py', content: 'salt = random.choice(ALPHABET)' })).toContain(
    'non-secure random generator for a token or secret in a.py',
  )
  expect(await reason('Write', { file_path: 'Gen.java', content: 'long sessionId = new Random().nextLong();' })).toContain(
    'non-secure random generator',
  )
  expect(await reason('Edit', { file_path: 'src/enc.js', old_string: '', new_string: "crypto.createCipheriv('des-cbc', key, iv)" })).toContain(
    'weak cipher or ECB mode in src/enc.js',
  )
  expect(await reason('Write', { file_path: 'Enc.java', content: 'Cipher.getInstance("AES");' })).toContain('weak cipher')
  expect(await reason('Write', { file_path: 'auth.py', content: 'jwt.decode(token, options={}, verify=False)' })).toContain(
    'unsigned, unverified or never-expiring JWTs in auth.py',
  )
  expect(await reason('Edit', { file_path: 'src/a.ts', old_string: '', new_string: 'jwt.verify(t, k, { ignoreExpiration: true })' })).toContain(
    'never-expiring JWTs',
  )
})

test('lets tests, fixtures, docs and comment lines through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  const body = "const hash = crypto.createHash('md5').update(password).digest('hex')"

  for (const file_path of ['tests/auth.ts', 'src/__tests__/a.ts', 'fixtures/a.js', 'docs/a.ts', 'NOTES.md', 'src/auth.spec.mjs']) {
    const verdict = await $.tool.check({ tool: 'Edit', input: { file_path, old_string: '', new_string: body } })
    expect(verdict.decision, file_path).toBe('allow')
  }

  const commented = await $.tool.check({ tool: 'Edit', input: { file_path: 'src/a.ts', old_string: '', new_string: `// ${body}\n# ${body}` } })
  expect(commented.decision).toBe('allow')
})

test('ignores tools that do not write files', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'echo -n "$password" | md5sum' } })
  expect(verdict.decision).toBe('allow')
})

test('keeps the reason of a verdict that already asks', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask', reason: 'asked beneath' }))

  const { tool, input } = ASKED[0] as Call
  const verdict = await $.tool.check({ tool, input })
  expect(verdict.reason).toBe('asked beneath')
})
