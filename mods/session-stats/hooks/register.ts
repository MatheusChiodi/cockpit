import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const elapsed = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60000))

  return minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`
}

export const register: Register = on => {
  let tools = 0
  let failures = 0
  let outputTokens = 0

  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'stats', description: s.command })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    tools += 1

    if (ran.deny !== undefined || ran.isError === true) {
      failures += 1
    }

    return ran
  })

  on('turn.complete', ($, e, next) => {
    outputTokens += e.usage?.output_tokens ?? 0

    return next(e)
  })

  on('command.run', { command: 'stats' }, async $ => {
    const [usage, now, turns, model, cwd, s] = await Promise.all([
      $.session.usage(),
      $.clock.now(),
      $.session.turns(),
      $.session.model(),
      $.session.cwd(),
      strings($),
    ])
    const { context, cost } = usage

    return {
      text: [
        s.session(elapsed(now - usage.startedAt), cwd),
        `${s.model}${model}`,
        `${s.prompts}${turns}`,
        s.tools(tools, failures),
        s.output(outputTokens.toLocaleString(s.locale)),
        s.context(context.percent ?? 0, context.window.toLocaleString(s.locale)),
        s.cost(cost === undefined ? undefined : cost.usd.toFixed(2)),
      ].join('\n'),
    }
  })
}
