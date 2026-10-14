import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { Kind } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SECRETS: readonly { pattern: RegExp; kind: Kind }[] = [
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, kind: 'aws' },
  { pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/, kind: 'privateKey' },
  { pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/, kind: 'anthropic' },
  { pattern: /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/, kind: 'apiKey' },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, kind: 'github' },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{40,}/, kind: 'github' },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/, kind: 'slack' },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, kind: 'google' },
  { pattern: /\b[sr]k_live_[0-9a-zA-Z]{24,}/, kind: 'stripe' },
]

// Why the prompt is dropped, in the session's language; undefined when it holds no secret.
const verdict = async ($: EngineInterface, text: string): Promise<string | undefined> => {
  const kind = SECRETS.find(secret => secret.pattern.test(text))?.kind

  if (kind === undefined) {
    return undefined
  }

  const s = await strings($)

  return s.dropped(s[kind])
}

export const register: Register = on => {
  // Stops the prompt before it enters the conversation (and the transcript).
  on('prompt.submit', async ($, e, next) => {
    const drop = await verdict($, e.text)

    return drop === undefined ? next(e) : { drop }
  }).catch(($, e, next) => (next.called ? next(e) : { drop: STRINGS.en.failed }))
}
