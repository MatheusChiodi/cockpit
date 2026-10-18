import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: a reload drops it along with the old environment.
const spawned: { what: string; model: string }[] = []

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agentmodels', description: (await strings($)).command })

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)

    if (started.deny === undefined) {
      const what = e.description.slice(0, 40)
      spawned.push({ what, model: started.model })

      // Only a model other than the main loop's is news.
      if (started.model !== e.parentModel) {
        $.ui.toast((await strings($)).toast(what, started.model, e.parentModel), { timeoutMs: 6000 })
      }
    }

    return started
  })

  on('command.run', { command: 'agentmodels' }, async $ => {
    const s = await strings($)

    return { text: spawned.length === 0 ? s.none : spawned.map(entry => s.line(entry.what, entry.model)).join('\n') }
  })
}
