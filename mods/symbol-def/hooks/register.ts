import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Runs git on the host; undefined when git cannot start.
const git = async ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

// Files that hold credentials: their content is never printed. Templates (.env.example) are fine.
const SECRET =
  /(^|\/)(\.env(\.(?!example|sample|template|dist)[^/]*)?|\.npmrc|\.netrc|\.pgpass|id_(rsa|dsa|ecdsa|ed25519)|[^/]*\.(pem|key|p12|pfx|jks|keystore)|[^/]*(secret|credential)s?[^/]*\.(json|ya?ml|toml|env|txt))$/i

const CAP = 30
const SYMBOL = /^[A-Za-z_]\w*$/

// Declarations of the name: "function x", "class x", "def x" ... or "x = (" / "x: async () =>".
const pattern = (name: string): string => {
  const kinds = '(function\\*?|class|interface|type|enum|const|let|var|def|fn|struct|trait|func|object|record|namespace)'
  const assigned = '(async[[:space:]]+)?(function|\\(|[[:alnum:]_]+[[:space:]]*=>)'

  return `${kinds}[[:space:]]+${name}([^[:alnum:]_]|$)|(^|[[:space:]])${name}[[:space:]]*[:=][[:space:]]*${assigned}`
}

const define = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (!SYMBOL.test(typed)) {
    return { text: s.usage }
  }

  const ran = await git($, ['grep', '-n', '-I', '--no-color', '-E', '-e', pattern(typed)])

  if (ran === undefined || (ran.exitCode !== 0 && ran.exitCode !== 1)) {
    return { text: s.noGit }
  }

  const hits = ran.stdout.split('\n').flatMap(line => {
    const found = /^([^:]+):(\d+):(.*)$/.exec(line)

    return found === null || SECRET.test(found[1] ?? '') ? [] : [`${found[1]}:${found[2]}  ${(found[3] ?? '').trim().slice(0, 90)}`]
  })

  if (hits.length === 0) {
    return { text: s.none(typed) }
  }

  return { text: (hits.length > CAP ? [...hits.slice(0, CAP), s.more(hits.length - CAP)] : hits).join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'def', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'def' }, ($, e) => define($, e.args.trim()))
}
