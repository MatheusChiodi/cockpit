import { expect, test } from 'claude-code/testing'

type Call = { tool: string; input: Record<string, string> }

const ASKED: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/client.ts', old_string: '', new_string: 'const agent = new https.Agent({ rejectUnauthorized: false })' } },
  { tool: 'Write', input: { file_path: 'fetch.py', content: 'r = requests.get(url, verify=False)' } },
  { tool: 'Write', input: { file_path: 'main.go', content: 'tr := &tls.Config{InsecureSkipVerify: true}' } },
  { tool: 'Bash', input: { command: 'curl -k https://staging.example.com/health' } },
  { tool: 'Bash', input: { command: 'curl -sSLk https://example.io/install' } },
  { tool: 'Bash', input: { command: 'NODE_TLS_REJECT_UNAUTHORIZED=0 npm test' } },
  { tool: 'Bash', input: { command: 'git config --global http.sslVerify false' } },
  { tool: 'Bash', input: { command: 'wget --no-check-certificate https://example.io/f.zip' } },
]

const FINE: readonly Call[] = [
  { tool: 'Edit', input: { file_path: 'src/client.ts', old_string: '', new_string: 'const agent = new https.Agent({ rejectUnauthorized: true })' } },
  { tool: 'Write', input: { file_path: 'fetch.py', content: 'r = requests.get(url, verify=True)' } },
  { tool: 'Write', input: { file_path: 'fetch.py', content: 'r = requests.get(url, verify=cafile)' } },
  { tool: 'Write', input: { file_path: 'main.go', content: 'tr := &tls.Config{InsecureSkipVerify: false}' } },
  { tool: 'Bash', input: { command: 'curl -sS https://example.io/health' } },
  { tool: 'Bash', input: { command: 'curl --keepalive-time 5 https://example.io' } },
  { tool: 'Bash', input: { command: 'curl -o out.zip -L https://example.io/f.zip' } },
  { tool: 'Bash', input: { command: 'git config user.name me' } },
  { tool: 'Bash', input: { command: 'npm test' } },
  { tool: 'Edit', input: { file_path: 'src/client.test.ts', old_string: '', new_string: 'const agent = new https.Agent({ rejectUnauthorized: false })' } },
]

test('asks before what it exists to catch', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const { tool, input } of ASKED) {
    const verdict = await $.tool.check({ tool, input })
    expect(verdict.decision, JSON.stringify(input)).toBe('ask')
    expect(verdict.reason, JSON.stringify(input)).toContain('tls-off-guard:')
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
    input: { file_path: 'src/client.ts', old_string: 'const agent = new https.Agent({ rejectUnauthorized: false })', new_string: 'const agent = new https.Agent({ rejectUnauthorized: false })\nconst retries = 2' },
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
  expect(verdict.reason).toContain('desliga a verificação do certificado TLS em src/client.ts')
})

test('asks for the other command forms it knows', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of [
    'GIT_SSL_NO_VERIFY=1 git clone https://x/y',
    'PYTHONHTTPSVERIFY=0 python app.py',
    'npm config set strict-ssl false',
    'curl --insecure https://x',
  ]) {
    expect((await $.tool.check({ tool: 'Bash', input: { command } })).decision, command).toBe('ask')
  }

  const ps = await $.tool.check({ tool: 'PowerShell', input: { command: 'Invoke-WebRequest https://x -SkipCertificateCheck' } })
  expect(ps.decision).toBe('ask')
  expect(ps.reason).toContain('runs a command with TLS verification off (Invoke-WebRequest https://x -SkipCertificateCheck)')
})

test('lets commented lines and docs, examples and fixtures through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const calls: Call[] = [
    { tool: 'Write', input: { file_path: 'src/a.ts', content: '// never do rejectUnauthorized: false' } },
    { tool: 'Write', input: { file_path: 'src/a.py', content: '# verify=False is unsafe' } },
    { tool: 'Write', input: { file_path: 'docs/tls.ts', content: 'rejectUnauthorized: false' } },
    { tool: 'Write', input: { file_path: 'README.md', content: 'verify=False' } },
    { tool: 'Write', input: { file_path: 'config.example', content: 'strictSSL: false' } },
    { tool: 'Write', input: { file_path: String.raw`src\fixtures\a.go`, content: 'InsecureSkipVerify: true' } },
  ]

  for (const { tool, input } of calls) {
    expect((await $.tool.check({ tool, input })).decision, JSON.stringify(input)).toBe('allow')
  }
})

test('leaves other tools and an ask beneath as they are', async ($, on) => {
  let decision: 'allow' | 'ask' = 'allow'
  on('tool.check', () => (decision === 'ask' ? { decision, reason: 'beneath' } : { decision }))

  expect((await $.tool.check({ tool: 'Read', input: { file_path: 'a.ts', content: 'verify=False' } })).decision).toBe('allow')

  decision = 'ask'
  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'curl -k https://x' } })
  expect(verdict.reason).toBe('beneath')
})

test('names the file and spells the command in Spanish', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const code = await $.tool.check({ tool: 'Write', input: { file_path: 'api.php', content: 'curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);' } })
  expect(code.reason).toContain('desactiva la verificación del certificado TLS en api.php')

  const command = await $.tool.check({ tool: 'Bash', input: { command: 'wget --no-check-certificate https://x' } })
  expect(command.reason).toContain('ejecuta un comando con la verificación TLS desactivada')
})

test('cuts a long command to 60 characters in the reason', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const long = `curl -k https://example.io/${'a'.repeat(100)}`
  const verdict = await $.tool.check({ tool: 'Bash', input: { command: long } })
  expect(verdict.reason).toContain(`(${long.slice(0, 60)})`)
})
