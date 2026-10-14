import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// Prompts in a row with no file changed.
const PROMPTS = 10
const TOAST_MS = 12000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: prompts since the last file changed.
const run: { prompts: number } = { prompts: 0 }

const changed = (agentId: unknown): void => {
  if (agentId === undefined) {
    run.prompts = 0
  }
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    run.prompts = 0

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    run.prompts += 1

    // Said at the exact count; it speaks again only after a file changes and ten more prompts pass.
    if (run.prompts === PROMPTS) {
      $.ui.toast((await strings($)).wandering(PROMPTS), { timeoutMs: TOAST_MS })
    }

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async (_$, e, next) => {
    const ran = await next(e)
    changed((e as { agentId?: string }).agentId)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_$, e, next) => {
    const ran = await next(e)
    changed((e as { agentId?: string }).agentId)

    return ran
  })
}
