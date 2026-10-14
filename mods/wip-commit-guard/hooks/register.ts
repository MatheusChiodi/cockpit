import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const COMMIT = /\bgit\s+commit\b/
const MESSAGE = /(?:\s-[a-zA-Z]*m|\s--message=?)\s*(?:"([^"]*)"|'([^']*)'|(\S+))/
const THROWAWAY = /^(wip|fix|fixes|fixed|update|updates|changes|change|stuff|test|tests|tmp|temp|asdf+|a+|\.+|-+|x+|save|commit)[.!]*$/i

// The first -m message of a git commit; undefined when there is none.
const messageOf = (command: string): string | undefined => {
  if (!COMMIT.test(command)) {
    return undefined
  }

  const found = MESSAGE.exec(command)

  return found === null ? undefined : (found[1] ?? found[2] ?? found[3])
}

const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  const message = messageOf(command)?.trim()

  return message !== undefined && THROWAWAY.test(message) ? (await strings($)).blocked(message) : undefined
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
