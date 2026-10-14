import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const COMMIT = /\bgit\s+commit\b/
const ALL = /\bgit\s+commit\b[^|;&\n]*(\s-[a-zA-Z]*a[a-zA-Z]*\b|\s--all\b)/
const MARKERS = '-G^(<<<<<<< |>>>>>>> )'
const SHOWN = 5

// Why the commit is refused; undefined when no changed line is a conflict marker.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  if (!COMMIT.test(command)) {
    return undefined
  }

  const against = ALL.test(command) ? 'HEAD' : '--cached'
  const ran = await $.process.run(['git', '--no-pager', 'diff', against, '--name-only', MARKERS], { timeoutMs: 10000 })
  const files = ran.exitCode === 0 ? ran.stdout.split('\n').filter(line => line !== '') : []

  if (files.length === 0) {
    return undefined
  }

  const more = files.length > SHOWN ? ` (+${files.length - SHOWN})` : ''

  return (await strings($)).blocked(`${files.slice(0, SHOWN).join(', ')}${more}`)
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
