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
