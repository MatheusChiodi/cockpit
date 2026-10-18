import { expect, test } from 'claude-code/testing'

const ASKED = [
  'ngrok http 3000',
  'npx ngrok http 3000',
  'cloudflared tunnel --url http://localhost:3000',
  'lt --port 3000',
  'npx localtunnel --port 3000',
  'ssh -R 80:localhost:3000 serveo.net',
  'ssh -N -R 8080:localhost:3000 user@host',
  'sudo tailscale funnel 3000',
  'vite --host 0.0.0.0',
  'npm run dev -- --host',
  'next dev -H 0.0.0.0',
  'cd app && vite --host && echo done',
]

const QUIET = [
  'npm install ngrok',
  'ssh user@host',
  'ssh -i key.pem user@host',
  'vite --host localhost',
  'npm run dev',
  'vite --host 127.0.0.1',
  'tailscale status',
  'git status',
]

test('asks before exposing the machine to the internet', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ASKED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('tunnel-guard')
  }
})

test('stays quiet on everyday commands and on other tools', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of QUIET) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }

  const other = await $.tool.check({ tool: 'Read', input: { command: 'ngrok http 80' } })
  expect(other.decision).toBe('allow')
})

test('asks on PowerShell too', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const verdict = await $.tool.check({ tool: 'PowerShell', input: { command: 'ngrok.exe http 3000' } })
  expect(verdict.decision).toBe('ask')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'ngrok http 3000' } })
  expect(verdict.reason).toContain('abrir um túnel público')
  expect(verdict.reason).toContain('Confirme antes de rodar')
})

test('names the kind of exposure in the reason', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  const reasons: [string, string][] = [
    ['autossh -M 0 -R 80:localhost:3000 host', 'opening a reverse SSH tunnel (ssh -R)'],
    ['tailscale funnel 443', 'publishing with tailscale funnel'],
    ['HOST=0.0.0.0 node server.js', 'binding a server to every network interface (0.0.0.0)'],
    ['python -m http.server --bind ::', 'binding a server to every network interface (0.0.0.0)'],
    ['curl https://serveo.net', 'opening a public tunnel'],
  ]

  for (const [command, why] of reasons) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.reason, command).toBe(`tunnel-guard: ${why}. This exposes your machine to the internet. Confirm before running.`)
  }
})

test('leaves a deny or an ask beneath as it is', async ($, on) => {
  let verdict: { decision: 'deny' | 'ask'; reason: string } = { decision: 'deny', reason: 'blocked beneath' }
  on('tool.check', () => verdict)

  expect(await $.tool.check({ tool: 'Bash', input: { command: 'ngrok http 3000' } })).toMatchObject({ decision: 'deny', reason: 'blocked beneath' })

  verdict = { decision: 'ask', reason: 'asked beneath' }
  expect((await $.tool.check({ tool: 'Bash', input: { command: 'ngrok http 3000' } })).reason).toBe('asked beneath')
})

test('lets through a call with no command and look-alike words', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const input of [{}, { command: 42 }, { command: 'echo ngrokish' }, { command: 'vite --host 0.0.0.01' }, { command: 'cat salt.txt --port 3' }]) {
    expect((await $.tool.check({ tool: 'Bash', input: input as never })).decision, JSON.stringify(input)).toBe('allow')
  }
})

test('speaks Spanish when the hub says so', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'PowerShell', input: { command: 'ssh -R 80:localhost:3000 host' } })
  expect(verdict.reason).toBe('tunnel-guard: abrir un túnel SSH inverso (ssh -R). Esto expone tu máquina a internet. Confirma antes de ejecutar.')
})
