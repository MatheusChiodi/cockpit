import type { Register } from 'claude-code'

const MAX_KEPT = 5
const MAX_COMMAND = 100
const MAX_REASON = 100
const OPAQUE = /\b[A-Za-z0-9_-]{32,}\b/g
const ASSIGNED = /\b(\w*(?:token|secret|passw\w*|key|auth)\w*)(\s*[=:]\s*|\s+)\S+/gi

type Failure = { command: string; reason: string }

// Module state: the failures of this session, newest last. The hidden context is read by the model only: English, not translated.
const failed: { list: Failure[] } = { list: [] }

// Nothing that looks like a credential leaves this module.
const scrub = (text: string): string => text.replace(ASSIGNED, '$1=…').replace(OPAQUE, '…')

const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max)}…` : text)

const reasonOf = (ran: { result?: unknown; text?: string }): string => {
  const result = ran.result
  const output =
    typeof result === 'string'
      ? result
      : result !== null && typeof result === 'object'
        ? [(result as { stdout?: unknown }).stdout, (result as { stderr?: unknown }).stderr].filter(part => typeof part === 'string').join('\n')
        : (ran.text ?? '')
  const last = output
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .pop()

  return last === undefined ? '' : clip(scrub(last), MAX_REASON)
}

// Watches a shell call without changing it: what `run` resolves to goes back untouched.
const watch = async <R extends { deny?: string; isError?: boolean; result?: unknown; text?: string }>(
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const ran = await run()

  if (ran.deny === undefined) {
    const shown = clip(scrub(command.trim().replace(/\s+/g, ' ')), MAX_COMMAND)
    const rest = failed.list.filter(item => item.command !== shown)

    failed.list = ran.isError === true ? [...rest, { command: shown, reason: reasonOf(ran) }].slice(-MAX_KEPT) : rest
  }

  return ran
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    failed.list = []

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, (_$, e, next) => watch(e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, (_$, e, next) => watch(e.command, () => next(e)))

  // Every typed prompt carries the open failures, so a retry is a decision and not a reflex.
  on('prompt.submit', (_$, e, next) => {
    if (e.origin.kind !== 'composer' || e.text.startsWith('/') || failed.list.length === 0) {
      return next(e)
    }

    const lines = failed.list.map(item => `- ${item.command}${item.reason === '' ? '' : ` -> ${item.reason}`}`)
    const text = `Commands that failed earlier this session and have not succeeded since; change something before running them again:\n${lines.join('\n')}`

    return next({ ...e, context: [...(e.context ?? []), text] })
  })
}
