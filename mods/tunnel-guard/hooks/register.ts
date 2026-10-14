import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Where a command starts: the line, after a separator, or after a launcher such as sudo or npx.
const HEAD = String.raw`(?:^|[;&|(\n]\s*|\b(?:sudo|npx|bunx|dlx|exec)\s+(?:-\S+\s+)*)`

const RULES: readonly { pattern: RegExp; why: Reason }[] = [
  { pattern: new RegExp(`${HEAD}(?:ngrok|localtunnel|loophole)(?:\\.exe)?\\b`), why: 'tunnel' },
  { pattern: new RegExp(`${HEAD}cloudflared(?:\\.exe)?\\s+tunnel\\b`), why: 'tunnel' },
  { pattern: new RegExp(`${HEAD}lt\\s+[^|;&\\n]*(?:--port|-p)\\b`), why: 'tunnel' },
  { pattern: /serveo\.net/i, why: 'tunnel' },
  { pattern: new RegExp(`${HEAD}(?:auto)?ssh\\s+(?:[^|;&\\n]*\\s)?-[a-zA-Z]*R`), why: 'reverse' },
  { pattern: new RegExp(`${HEAD}tailscale(?:\\.exe)?\\s+funnel\\b`), why: 'funnel' },
  { pattern: /(?:--host|--hostname|--bind|-H)(?:=|\s+)(?:0\.0\.0\.0|::)(?![\w.])|\bHOST=0\.0\.0\.0\b/, why: 'bind' },
]

// Vite and the dev scripts that run it listen on every interface when --host has no value.
const DEV_SERVER = /\bvite\b|\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve)\b/
const BARE_HOST = /--host(?=\s*$|\s+-|\s*[;&|])/

const reasonOf = (command: string): Reason | undefined =>
  RULES.find(rule => rule.pattern.test(command))?.why ?? (DEV_SERVER.test(command) && BARE_HOST.test(command) ? 'bind' : undefined)

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

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
