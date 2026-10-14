import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MAX_LINES = 1500
const MAX_BYTES = 200 * 1024

// UTF-8 size without Node: one to four bytes per code point.
const bytesOf = (text: string): number => {
  let bytes = 0

  for (let at = 0; at < text.length; at += 1) {
    const code = text.charCodeAt(at)

    if (code < 0x80) {
      bytes += 1
    } else if (code < 0x800) {
      bytes += 2
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4
      at += 1
    } else {
      bytes += 3
    }
  }

  return bytes
}

const linesOf = (text: string): number => text.split('\n').length - (text.endsWith('\n') ? 1 : 0)

const verdict = async ($: EngineInterface, path: string, content: string): Promise<string | undefined> => {
  const lines = linesOf(content)
  const bytes = lines > MAX_LINES ? 0 : bytesOf(content)

  if (lines <= MAX_LINES && bytes <= MAX_BYTES) {
    return undefined
  }

  const s = await strings($)

  return s.blocked(path, lines > MAX_LINES ? s.lines(lines) : s.kb(Math.ceil(bytes / 1024)))
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path, e.content)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
