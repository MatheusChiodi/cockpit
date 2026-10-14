import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Strings } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Finding = (s: Strings) => string

// Root, a home directory or a top-level system directory, as a recursive chown target.
const BROAD_TARGET =
  /^(?:\/(?:home|Users|etc|usr|var|bin|sbin|lib|opt|root|boot|srv)?\/?\*?|\/(?:home|Users)\/[^/]+\/?\*?|~(?:\/\*?)?|\$\{?HOME\}?(?:\/\*?)?)$/

// Everyone (or the Portuguese group, or the well-known SID) granted full, modify or write access.
const ICACLS = /\bicacls\b[^|;&\n]*\/grant[^|;&\n]*(?:Everyone|Todos|\*S-1-1-0):(?:\([A-Z,]+\))*\(?[FMW]\)?(?![A-Za-z])/i

const tokenize = (segment: string): string[] =>
  (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(token => token.replace(/^['"]|['"]$/g, ''))

const isRecursive = (flag: string): boolean => /^-[a-zA-Z]*R[a-zA-Z]*$/.test(flag) || flag === '--recursive'

// Octal modes with the write bit for others, or symbolic clauses that add write for others/all.
const worldWritable = (mode: string): boolean =>
  /^[0-7]{3,4}$/.test(mode)
    ? (Number(mode.slice(-1)) & 2) !== 0
    : mode.split(',').some(clause => {
        const parts = /^([ugoa]*)([-+=])([rwxXst]*)/.exec(clause)

        return parts !== null && /[ao]/.test(parts[1] ?? '') && parts[2] !== '-' && (parts[3] ?? '').includes('w')
      })

const segmentFinding = (segment: string): Finding | undefined => {
  const tokens = tokenize(segment.trim())
  const at = tokens[0] === 'sudo' ? 1 : 0
  const head = tokens[at]
  const args = tokens.slice(at + 1)
  const plain = args.filter(token => !token.startsWith('-'))

  if (head === 'chmod') {
    const mode = plain[0]

    return mode !== undefined && worldWritable(mode) ? s => s.worldWritable(mode) : undefined
  }

  if (head === 'chown' || head === 'chgrp') {
    const target = plain.slice(1).find(path => BROAD_TARGET.test(path))

    return target !== undefined && args.some(isRecursive) ? s => s.ownership(target) : undefined
  }

  return undefined
}

// Why the command is refused, in the session's language; undefined when it may run.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const found: Finding | undefined = ICACLS.test(command)
    ? s => s.icacls
    : command
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
