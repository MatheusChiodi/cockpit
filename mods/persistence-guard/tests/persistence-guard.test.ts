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
