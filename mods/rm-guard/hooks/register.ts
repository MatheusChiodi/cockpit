import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Reason } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Targets that must never be deleted recursively: root, home, the whole cwd, a drive root.
const ROOTISH =
  /^(?:\/|\/\*|~|~\/|~\/\*|\$HOME\/?\*?|\$\{HOME\}\/?\*?|\*|\.|\.\/|\.\/\*|\.\.|\.\.\/|\.\.\/\*|[a-z]:[\\/]?\*?|\$env:USERPROFILE[\\/]?\*?|\$env:SystemDrive[\\/]?\*?|\$env:HOMEDRIVE[\\/]?\*?|\\)$/i

const REMOVERS = new Set(['rm', 'remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir'])

const ALWAYS: readonly { pattern: RegExp; why: Reason }[] = [
  { pattern: /\bmkfs(\.\w+)?\b/, why: 'mkfs' },
  { pattern: /\bdd\b[^|;&]*\bof=\/dev\/(sd|nvme|disk|hd|mmcblk)/, why: 'dd' },
  { pattern: />\s*\/dev\/(sd|nvme|disk|hd|mmcblk)/, why: 'redirect' },
  { pattern: /\bformat(\.com)?\s+[a-z]:/i, why: 'format' },
  { pattern: /\b(Format-Volume|Clear-Disk|Initialize-Disk)\b/i, why: 'wipe' },
  { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, why: 'forkBomb' },
  { pattern: /\bchmod\s+(-[a-zA-Z]*R[a-zA-Z]*\s+)+(777|a\+rwx)\s+\/(\s|$)/, why: 'chmod' },
]

const unquote = (token: string): string => token.replace(/^['"]|['"]$/g, '')

const isRecursive = (flag: string): boolean =>
  /^-[a-z]*r[a-z]*$/i.test(flag) ||
  /^--recursive$/.test(flag) ||
  /^-rec(u(r(se?)?)?)?$/i.test(flag) ||
  /^\/s$/i.test(flag)

// The root-like target a removal command would delete recursively, if any.
const removalTarget = (segment: string): string | undefined => {
  const tokens = segment.trim().split(/\s+/).map(unquote)
  const start = tokens[0] === 'sudo' ? 1 : 0
  const head = tokens[start]?.toLowerCase()

  if (head === undefined || !REMOVERS.has(head)) {
    return undefined
  }

  const rest = tokens.slice(start + 1)
  const target = rest.find(token => ROOTISH.test(token))

  return target !== undefined && rest.some(isRecursive) ? target : undefined
}

// Why the command is refused, in the session's language; undefined when it may run.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const always = ALWAYS.find(rule => rule.pattern.test(command))?.why
  const target = command
    .split(/&&|\|\||[;|\n]/)
    .map(removalTarget)
    .find(found => found !== undefined)

  if (always === undefined && target === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.blocked(always === undefined ? s.removal(target ?? '') : s[always])
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
