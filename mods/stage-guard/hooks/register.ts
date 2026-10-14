import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// git add -A, --all, . or *, and git commit -a / -am: everything changed goes in.
const STAGES_ALL =
  /\bgit\s+add\s+(?:[^|;&\n]*\s)?(-A|--all|\.|\*)(\s|$|[;&|])|\bgit\s+commit\b[^|;&\n]*(\s-[a-zA-Z]*a[a-zA-Z]*\b|\s--all\b)/
const SECRET =
  /(^|\/)(\.env(\.(?!example|sample|template)[\w.-]+)?|[^/]*\.(pem|key|p12|pfx|keystore)|id_(rsa|dsa|ecdsa|ed25519)|credentials\.json|\.npmrc)$/
const SHOWN = 5

// Why the command is refused, in the session's language; undefined when it may run.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  if (!STAGES_ALL.test(command)) {
    return undefined
  }

  const ran = await $.process.run(['git', '--no-pager', 'status', '--porcelain=v1', '-uall'], { timeoutMs: 10000 })

  if (ran.exitCode !== 0) {
    return undefined
  }

  // "XY path" or "XY old -> new"; ignored files never show up here.
  const paths = ran.stdout
    .split('\n')
    .filter(line => line.length > 3)
    .map(line => line.slice(3).split(' -> ').pop() ?? '')
  const secrets = paths.filter(path => SECRET.test(path))

  if (secrets.length === 0) {
    return undefined
  }

  const more = secrets.length > SHOWN ? ` (+${secrets.length - SHOWN})` : ''

  return (await strings($)).blocked(`${secrets.slice(0, SHOWN).join(', ')}${more}`)
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
