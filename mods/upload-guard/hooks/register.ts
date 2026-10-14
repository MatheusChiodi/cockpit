import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Strings } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Finding = (s: Strings) => string

// curl reading a body or a file from disk: -d @f, --data-binary @f, --data-urlencode name@f, -F name=@f, -T f.
const CURL_UPLOAD = [
  /(?:^|\s)(?:-d|--data|--data-binary|--data-ascii|--json)(?:\s+|=)?['"]?@/,
  /(?:^|\s)--data-urlencode(?:\s+|=)?['"]?[\w.-]*@/,
  /(?:^|\s)(?:-F|--form)(?:\s+|=)?['"]?[^\s'"=]+=['"]?[@<]/,
  /(?:^|\s)(?:-T|--upload-file)(?:\s|=)/,
]

// A host:path or user@host:path target. A drive letter (C:\) is one character and not a host.
const REMOTE = /^(?:[\w.-]+@)?(?:\[[\da-f:]+\]|[\w.-]{2,}):(?![\\])|^(?:scp|rsync|ssh):\/\/|^[\w.-]+::/i

const tokenize = (segment: string): string[] =>
  (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(token => token.replace(/^['"]|['"]$/g, ''))

// scp or rsync whose destination (the last argument) is a remote host.
const copyFinding = (segment: string): Finding | undefined => {
  const tokens = tokenize(segment.trim())
  const at = tokens[0] === 'sudo' ? 1 : 0
  const head = tokens[at]
  const target = tokens[tokens.length - 1] ?? ''

  return (head === 'scp' || head === 'rsync') && tokens.length - at >= 3 && REMOTE.test(target)
    ? s => s.copy(target)
    : undefined
}

const findingFor = (command: string): Finding | undefined => {
  if (/\bcurl\b/i.test(command) && CURL_UPLOAD.some(pattern => pattern.test(command))) {
    return s => s.curl
  }

  if (/\bwget\b[^|;&\n]*--(?:post-file|body-file)\b/.test(command)) {
    return s => s.wget
  }

  if (/\b(?:Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b[^|;&\n]*-InFile\b/i.test(command)) {
    return s => s.invoke
  }

  if (
    /(?<![\w.-])(?:nc|ncat|netcat)\b[^|;&\n]*<\s*\S/.test(command) ||
    /\|\s*(?:nc|ncat|netcat)\s+[\w.-]+\s+\d+/.test(command) ||
    />\s*\/dev\/(?:tcp|udp)\//.test(command)
  ) {
    return s => s.nc
  }

  return command
    .split(/&&|\|\||[;|\n]/)
    .map(copyFinding)
    .find(finding => finding !== undefined)
}

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

const reasonFor = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const finding = findingFor(command)

  if (finding === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.ask(finding(s))
}

export const register: Register = on => {
  // Does not block: asks the person, even when the command is already allowed in the permissions.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if (verdict.decision !== 'allow' || (e.tool !== 'Bash' && e.tool !== 'PowerShell')) {
      return verdict
    }

    const reason = await reasonFor($, commandOf(e.input))

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
