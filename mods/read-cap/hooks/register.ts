import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const MIN_BYTES = 150 * 1024
const LINES = 600

export const register: Register = on => {
  // A big file read whole is mostly noise: read the head, and tell Claude how to go on.
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    if (
      e.limit !== undefined ||
      e.offset !== undefined ||
      e.pages !== undefined ||
      e.allow_large === true ||
      /\.(png|jpe?g|gif|webp|pdf|ipynb)$/i.test(e.file_path)
    ) {
      return next(e)
    }

    const stat = await $.fs.stat(e.file_path).catch(() => undefined)

    if (stat === undefined || stat.kind !== 'file' || stat.size <= MIN_BYTES) {
      return next(e)
    }

    const kb = Math.round(stat.size / 1024)
    const ran = await next({ ...e, limit: LINES })

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']
    $.ui.toast(s.capped(e.file_path, kb, LINES), { timeoutMs: 5000 })

    return {
      ...ran,
      context: [
        ...(ran.context ?? []),
        `read-cap: ${e.file_path} is ${kb} KB, so only its first ${LINES} lines were read. Continue with offset ${LINES}, or Grep for the part you need, or pass allow_large to read it all.`,
      ],
    }
  }).catch(($, e, next) => next(e))
}
