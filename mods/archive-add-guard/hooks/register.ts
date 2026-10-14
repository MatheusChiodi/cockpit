import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const GIT_ADD = /\bgit\s+add\b([^|;&\n]*)/
const BINARY = /\.(?:zip|tar|tgz|gz|bz2|xz|7z|rar|exe|msi|dll|iso|dmg|pkg|dmp|bak|sqlite3?|mdb|psd|mov|mp4|avi)$/i
const MAX_BYTES = 5 * 1024 * 1024
const MAX_PATHS = 20

const unquote = (token: string): string => token.replace(/^['"]|['"]$/g, '')

const commandOf = (input: unknown): string => {
  const value = typeof input === 'object' && input !== null ? (input as Record<string, unknown>).command : undefined

  return typeof value === 'string' ? value : ''
}

// The confirmation reason, in the session's language; undefined when nothing heavy is being staged.
const reasonFor = async ($: EngineInterface, tool: string, input: unknown): Promise<string | undefined> => {
  const args = tool === 'Bash' || tool === 'PowerShell' ? GIT_ADD.exec(commandOf(input))?.[1] : undefined

  if (args === undefined) {
    return undefined
  }

  const paths = args
    .trim()
    .split(/\s+/)
    .map(unquote)
    .filter(token => token !== '' && !token.startsWith('-') && token !== '.')
    .slice(0, MAX_PATHS)

  for (const path of paths) {
    if (BINARY.test(path)) {
      return (await strings($)).binary(path)
    }

    const stat = await $.fs.stat(path).catch(() => undefined)

    if (stat?.kind === 'file' && stat.size > MAX_BYTES) {
      return (await strings($)).large(path, (stat.size / (1024 * 1024)).toFixed(1))
    }
  }

  return undefined
}

export const register: Register = on => {
  // Does not block: asks the person, even when permissions already allow the command.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const reason = verdict.decision === 'allow' ? await reasonFor($, e.tool, e.input) : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
