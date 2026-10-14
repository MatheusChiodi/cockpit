import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MIN_LENGTH = 1800

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const answered = await next(e)

    // Only long answers from the main loop; one cheap haiku call per summary.
    if (e.agentId !== undefined || e.reason !== 'answer' || e.answer.length < MIN_LENGTH) {
      return answered
    }

    const t = await strings($)
    const summary = await $.model.complete({
      model: 'haiku',
      system: `You summarize technical answers in ${t.language}. Return only the summary, in at most 2 sentences, with no prefix.`,
      prompt: e.answer.slice(0, 20000),
      maxTokens: 160,
      timeoutMs: 15000,
    })

    return summary.isAnswered ? { ...answered, text: `${t.label}: ${summary.text.trim()}` } : answered
  })
}
