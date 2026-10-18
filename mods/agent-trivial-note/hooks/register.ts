import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MAX_CHARS = 160
// One short line that opens with a verb a single Read, Bash or Grep answers.
const SINGLE = /^\s*(read|open|cat|show|print|view|list|run|execute|check (?:if|whether)|look at|get the (?:contents?|output))\b/i
// Words that mean real work, whatever the verb.
const WORK = /\b(and then|then|analy[sz]e|investigate|implement|refactor|fix|write|search (?:for|across)|all (?:the )?files)\b/i

const isSingleCall = (prompt: string): boolean =>
  prompt.length <= MAX_CHARS && !prompt.includes('\n') && SINGLE.test(prompt) && !WORK.test(prompt)

export const register: Register = on => {
  // Observes only: the spawn goes ahead.
  on('agent.spawn', async ($, e, next) => {
    if (e.isTeammate !== true && !e.fork && e.workflow === undefined && isSingleCall(e.prompt)) {
      $.ui.toast((await strings($)).toast((e.description || e.prompt).slice(0, 40)), { timeoutMs: 8000 })
    }

    return next(e)
  })
}
