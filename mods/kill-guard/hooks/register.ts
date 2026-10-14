import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Strings } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Finding = (s: Strings) => string

const SYSTEM_PROCESS =
  /^(?:explorer|svchost|csrss|smss|wininit|winlogon|lsass|services|system|dwm|ctfmon|conhost|fontdrvhost|registry)(?:\.exe)?$/i

// pkill flags that take a value, so the value is not mistaken for the pattern.
const PKILL_VALUE_FLAGS = new Set(['-u', '-U', '-g', '-G', '-P', '-s', '-t', '-T', '-c', '-F', '-L'])

const tokenize = (segment: string): string[] =>
  (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(token => token.replace(/^['"]|['"]$/g, ''))

// pkill is specific when it matches the exact name (-x), is anchored (^name or name$) or names several words.
const looseKill = (args: string[]): string | undefined => {
  const patterns: string[] = []
  let exact = false

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? ''

    if (PKILL_VALUE_FLAGS.has(arg)) {
      i += 1
    } else if (arg === '--exact' || /^-[a-zA-Z]*x[a-zA-Z]*$/.test(arg)) {
      exact = true
    } else if (!arg.startsWith('-')) {
      patterns.push(arg)
    }
  }

  const pattern = patterns[0] ?? ''
  const specific = pattern !== '' && (/^\^|\$$/.test(pattern) || /\s/.test(pattern)) && !/^[.*^$]+$/.test(pattern)
  const exactName = exact && pattern !== '' && !/^[.*]+$/.test(pattern)

  return specific || exactName ? undefined : pattern
}

const segmentFinding = (segment: string): Finding | undefined => {
  const tokens = tokenize(segment.trim())
  const at = tokens[0] === 'sudo' ? 1 : 0
  const head = tokens[at]
  const args = tokens.slice(at + 1)

  if (head === 'kill' && /^kill\s+(?:\S+\s+)+-1\s*$/.test(tokens.slice(at).join(' '))) {
    return s => s.everyone
  }

  if (head === 'killall' || head === 'killall5') {
    return s => s.killall
  }

  if (head === 'pkill') {
    const pattern = looseKill(args)

    return pattern === undefined ? undefined : s => s.pkill(pattern)
  }

  return undefined
}

// taskkill /IM on a wildcard or a system process; Stop-Process by wildcard or on every process.
const windowsFinding = (command: string): Finding | undefined => {
  for (const match of command.matchAll(/\btaskkill(?:\.exe)?\b[^|;&\n]*?[/-]im\s+(["']?)([^\s"']+)\1/gi)) {
    const name = match[2] ?? ''

    if (name.includes('*') || SYSTEM_PROCESS.test(name)) {
      return s => s.taskkill(name)
    }
  }

  const wildcard = /\b(?:Stop-Process|spps)\b[^|;&\n]*-Name\s+['"]?([^\s'"|]*\*[^\s'"|]*)/i.exec(command)?.[1]

  if (wildcard !== undefined) {
    return s => s.stopProcess(wildcard)
  }

  return /\b(?:Get-Process|gps)\s*(?:(?:-Name\s+)?['"]?\*['"]?)?\s*\|\s*(?:Stop-Process|spps)\b/i.test(command)
    ? s => s.stopAll
    : undefined
}

// Why the command is refused, in the session's language; undefined when it may run.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const found =
    windowsFinding(command) ??
    command
      .split(/&&|\|\||[;|\n]/)
      .map(segmentFinding)
      .find(finding => finding !== undefined)

  if (found === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.blocked(found(s))
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
