import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const COUNT = 30

const LOG = /^(\s*git\s+log)\b/
// Already bounded or piped: -n 5, -5, --max-count=5, | head.
const BOUNDED = /(^|\s)(-n\s*\d+|-\d+|--max-count[=\s]\d+)(\s|$)|[|;&<>]/

export const register: Register = on => {
  // An unbounded git log walks the whole history into the context: ask for the last 30 commits.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!LOG.test(e.command) || BOUNDED.test(e.command)) {
      return next(e)
    }

    const ran = await next({ ...e, command: e.command.replace(LOG, `$1 -n ${COUNT}`) })

    if (ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']
    $.ui.toast(s.capped(COUNT), { timeoutMs: 4000 })

    return {
      ...ran,
      context: [
        ...(ran.context ?? []),
        `git-log-limit capped this git log at ${COUNT} commits. Pass -n, a range (a..b) or a path if you need more or other history.`,
      ],
    }
  }).catch(($, e, next) => next(e))
}
