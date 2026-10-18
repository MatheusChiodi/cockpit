import { expect, test } from 'claude-code/testing'

const ASKED = [
  'crontab -e',
  'crontab jobs.txt',
  'echo "* * * * * /opt/run.sh" | crontab -',
  'echo "0 * * * * root /opt/run.sh" | sudo tee /etc/cron.d/run',
  'cp run.sh /etc/cron.daily/run',
  'schtasks /create /tn backup /tr backup.bat /sc daily',
  'sudo systemctl enable --now myapp',
  'launchctl load ~/Library/LaunchAgents/app.plist',
  'Register-ScheduledTask -TaskName Backup -Action $a -Trigger $t',
  'Copy-Item app.lnk "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\"',
]

const QUIET = [
  'crontab -l',
  'cat /etc/crontab',
  'cp /etc/cron.d/run /tmp/run',
  'systemctl status nginx',
  'schtasks /query',
  'ls "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"',
  'git status',
]

test('asks before something is set to run on its own', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ASKED) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('ask')
    expect(verdict.reason, command).toContain('persistence-guard')
  }
})

test('stays quiet on everyday commands and on other tools', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of QUIET) {
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision, command).toBe('allow')
  }

  const other = await $.tool.check({ tool: 'Read', input: { file_path: 'crontab -e' } })
  expect(other.decision).toBe('allow')
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  // Stands in for the hub: answers the language it would hold.
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'crontab -e' } })
  expect(verdict.decision).toBe('ask')
  expect(verdict.reason).toContain('editar o crontab')
  expect(verdict.reason).toContain('Confirme antes de rodar')
})

test('names what each command would set up', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  const NAMED: readonly (readonly [string, string])[] = [
    ['crontab -u deploy jobs.txt', 'editing the crontab'],
    ['echo job >> /etc/crontab', 'writing a cron job under /etc/cron*'],
    ['schtasks.exe /Create /tn x /tr y.bat /sc onlogon', 'creating a Windows scheduled task'],
    ['systemctl --user enable app.service', 'enabling a systemd unit'],
    ['launchctl bootstrap gui/501 app.plist', 'loading a launchd job'],
    ['register-scheduledtask -TaskName X', 'registering a scheduled task'],
    ['New-Item -ItemType SymbolicLink -Path shell:startup/app.lnk -Target app.exe', 'writing into a Startup folder'],
  ]

  for (const [command, what] of NAMED) {
    const verdict = await $.tool.check({ tool: 'PowerShell', input: { command } })
    expect(verdict.reason, command).toBe(`persistence-guard: ${what}. This makes something run on its own later. Confirm before running.`)
  }
})

test('stays quiet on crontab -r, systemctl disable and reading the Startup folder', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))

  for (const command of ['crontab -r', 'systemctl disable app', 'launchctl list', 'explorer shell:startup']) {
    expect((await $.tool.check({ tool: 'Bash', input: { command } })).decision, command).toBe('allow')
  }
})

test('keeps a deny or an ask from beneath as it was', async ($, on) => {
  let verdict: any = { decision: 'deny', reason: 'blocked beneath' }
  on('tool.check', () => verdict)

  expect(await $.tool.check({ tool: 'Bash', input: { command: 'crontab -e' } })).toEqual({ decision: 'deny', reason: 'blocked beneath' })
  verdict = { decision: 'ask', reason: 'asked beneath' }
  expect(await $.tool.check({ tool: 'Bash', input: { command: 'crontab -e' } })).toEqual({ decision: 'ask', reason: 'asked beneath' })
})

test('asks with a clear reason when the check fails', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'state down' }))

  expect(await $.tool.check({ tool: 'Bash', input: { command: 'crontab -e' } })).toEqual({
    decision: 'ask',
    reason: 'persistence-guard: the check failed, confirm manually.',
  })
})

test('speaks Spanish when the hub is set to es', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))

  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'sudo systemctl enable nginx' } })
  expect(verdict.reason).toBe(
    'persistence-guard: habilitar una unit de systemd. Esto hace que algo se ejecute solo después. Confirma antes de ejecutar.',
  )
})
