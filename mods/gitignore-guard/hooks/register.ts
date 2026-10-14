import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// A .gitignore entry that keeps a secret-bearing file out of the repository.
const SECRET_ENTRY =
  /^\/?(?:\*\*\/)?(?:\.env(?:\.(?!example|sample|template)[\w.*-]+|\*)?|\*\.(?:pem|key|p12|pfx|jks|keystore|tfvars)|id_(?:rsa|dsa|ecdsa|ed25519)\*?|\.npmrc|\.pypirc|\.netrc|credentials(?:\.json)?|secrets?(?:\/|\.\w+)?|\.aws\/?|\.ssh\/?|service-account[\w.*-]*|terraform\.tfstate\*?)$/i

// git add -f (or --force) naming a file that .gitignore protects.
const FORCE_ADD =
  /\bgit\s+add\b(?=[^|;&\n]*\s(?:-f|--force)\b)[^|;&\n]*?(\.env\b(?!\.(?:example|sample|template))|\S*\.(?:pem|key|p12|pfx)\b|\bid_(?:rsa|dsa|ecdsa|ed25519)\b|\.npmrc\b)/

const SHOWN = 3

const isGitignore = (path: string): boolean => /(^|[\\/])\.gitignore$/.test(path)

const entriesOf = (text: string): string[] =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')

// Secret entries the edit takes away, and negations (!.env) it adds.
const loosened = (before: string, after: string): string[] => {
  const was = new Set(entriesOf(before))
  const is = new Set(entriesOf(after))
  const removed = [...was].filter(entry => !is.has(entry) && SECRET_ENTRY.test(entry))
  const negated = [...is].filter(entry => !was.has(entry) && entry.startsWith('!') && SECRET_ENTRY.test(entry.slice(1)))

  return [...removed, ...negated]
}

const fieldOf = (input: unknown, key: string): string => {
  const value = typeof input === 'object' && input !== null ? (input as Record<string, unknown>)[key] : undefined

  return typeof value === 'string' ? value : ''
}

// The confirmation reason, in the session's language; undefined when the action is fine.
const reasonFor = async ($: EngineInterface, tool: string, input: unknown): Promise<string | undefined> => {
  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = fieldOf(input, 'command')
    const forced = FORCE_ADD.exec(command)

    return forced === null ? undefined : (await strings($)).force(command.trim().slice(0, 60), forced[1] ?? '')
  }

  const path = fieldOf(input, 'file_path')

  if ((tool !== 'Edit' && tool !== 'Write') || !isGitignore(path)) {
    return undefined
  }

  const before = tool === 'Edit' ? fieldOf(input, 'old_string') : await $.fs.read(path).catch(() => '')
  const after = tool === 'Edit' ? fieldOf(input, 'new_string') : fieldOf(input, 'content')
  const entries = loosened(before, after)

  return entries.length === 0 ? undefined : (await strings($)).removed(path, entries.slice(0, SHOWN).join(', '))
}

export const register: Register = on => {
  // Does not block: asks the person, even when permissions already allow the call.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const reason = verdict.decision === 'allow' ? await reasonFor($, e.tool, e.input) : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
