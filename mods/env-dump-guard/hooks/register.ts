import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Strings } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Finding = (s: Strings) => string

// PowerShell listing the Env: drive, or the .NET call that returns every variable.
const POWERSHELL_DUMP = [
  /\b(?:Get-ChildItem|gci|dir|ls|Get-Item|gi)\s+(?:-Path\s+)?['"]?Env:\\?\*?['"]?(?=\s|\||$)/i,
  /\[Environment\]::GetEnvironmentVariables\s*\(/i,
]

const tokenize = (segment: string): string[] =>
  (segment.replace(/\d*>>?\s*\S+|\d*>&\d/g, ' ').match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(token =>
    token.replace(/^['"]|['"]$/g, ''),
  )

// The command a segment runs when it lists the whole environment: env, printenv, set, export -p.
const segmentDump = (segment: string): string | undefined => {
  const tokens = tokenize(segment.trim())
  const at = tokens[0] === 'sudo' || tokens[0] === 'command' ? 1 : 0
  const head = tokens[at]?.toLowerCase()
  const rest = tokens.slice(at + 1)
  const flagsOnly = rest.every(token => token.startsWith('-'))

  switch (head) {
    case 'env':
    case 'printenv':
      return flagsOnly ? head : undefined
    case 'set':
      return rest.length === 0 ? head : undefined
    case 'export':
      return rest.length === 0 || (rest.length === 1 && rest[0] === '-p') ? 'export -p' : undefined
    case 'declare':
    case 'typeset':
      return rest.length > 0 && rest.every(token => /^-[px]+$/.test(token)) ? `${head} ${rest.join(' ')}` : undefined
    default:
      return undefined
  }
}

const findingFor = (command: string): Finding | undefined => {
  if (POWERSHELL_DUMP.some(pattern => pattern.test(command))) {
    return s => s.powershell
  }

  const dump = command
    .split(/&&|\|\||[;|\n]/)
    .map(segmentDump)
    .find(found => found !== undefined)

  return dump === undefined ? undefined : s => s.env(dump)
}

// Why the command is refused, in the session's language; undefined when it may run.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const finding = findingFor(command)

  if (finding === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.blocked(finding(s))
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
