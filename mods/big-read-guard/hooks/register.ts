import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const MAX_BYTES = 512 * 1024

export const register: Register = on => {
  // Reading a huge file whole burns context: without `limit`, ask for a slice.
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    if (e.limit !== undefined || e.pages !== undefined) {
      return next(e)
    }

    const stat = await $.fs.stat(e.file_path).catch(() => undefined)

    if (
      stat === undefined ||
      stat.kind !== 'file' ||
      stat.size <= MAX_BYTES ||
      /\.(png|jpe?g|gif|webp|pdf)$/i.test(e.file_path)
    ) {
      return next(e)
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']

    return { deny: s.tooBig(e.file_path, Math.round(stat.size / 1024)) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
