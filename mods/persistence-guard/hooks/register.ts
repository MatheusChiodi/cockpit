import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const STARTUP = /(?:Start Menu[\\/]+Programs[\\/]+Startup|shell:startup)/i
const WRITER = /(?:>>?|\b(?:cp|mv|ln|tee|install|copy|move|xcopy|Copy-Item|Move-Item|New-Item|Set-Content|Add-Content|Out-File)\b)/i

const RULES: readonly { pattern: RegExp; why: Reason }[] = [
  // crontab -e, crontab <file>, crontab - (stdin); -l and -r stay quiet.
  { pattern: /\bcrontab\s+(?:-u\s+\S+\s+)?(?:-e\b|-(?=\s|$)|[^-\s|;&<>]\S*)/, why: 'cron' },
  {
    pattern: /(?:>>?\s*|\btee\s+(?:-a\s+)?)\/etc\/cron|\b(?:cp|mv|install|ln)\b[^|;&\n]*\s\/etc\/cron\S*\s*(?:$|[;&|])/,
    why: 'cronDir',
  },
  { pattern: /\bschtasks(?:\.exe)?\s+\/create\b/i, why: 'schtasks' },
  { pattern: /\bsystemctl\b[^|;&\n]*\benable\b/, why: 'systemd' },
  { pattern: /\blaunchctl\s+(?:load|bootstrap|enable)\b/, why: 'launchd' },
  { pattern: /\bRegister-ScheduledTask\b/i, why: 'scheduledTask' },
]

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

const reasonOf = (command: string): Reason | undefined =>
  RULES.find(rule => rule.pattern.test(command))?.why ??
  (STARTUP.test(command) && WRITER.test(command) ? 'startup' : undefined)

export const register: Register = on => {
  // Does not block: puts the call to the person even when permissions already allow it.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const why = e.tool === 'Bash' || e.tool === 'PowerShell' ? reasonOf(commandOf(e.input)) : undefined

    if (why === undefined || verdict.decision !== 'allow') {
      return verdict
    }

    const s = await strings($)

    return { decision: 'ask', reason: s.ask(s[why]) }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
