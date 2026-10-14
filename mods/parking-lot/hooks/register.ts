import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Idea = { text: string; at: number; isShown: boolean }

const TOAST_MS = 12000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// One list per project: the store key is the session's root.
const load = async ($: EngineInterface): Promise<{ key: string; ideas: Idea[] }> => {
  const key = `park:${await $.session.root()}`
  const held = await $.store.get(key)

  return { key, ideas: Array.isArray(held) ? (held as Idea[]) : [] }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'park', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'park' }, async ($, e) => {
    const s = await strings($)
    const { key, ideas } = await load($)
    const args = e.args.trim()
    const [action, value] = args.split(/\s+/)

    if (args === '') {
      return { text: ideas.length === 0 ? s.empty : [s.header(ideas.length), ...ideas.map((idea, i) => `${i + 1}. ${idea.text}`)].join('\n') }
    }

    if (action === 'clear' && value === undefined) {
      await $.store.delete(key)

      return { text: s.cleared }
    }

    if (action === 'done' && value !== undefined && /^[0-9]+$/.test(value)) {
      const done = ideas[Number(value) - 1]

      if (done === undefined) {
        return { text: s.missing(ideas.length) }
      }

      await $.store.set(key, ideas.filter(idea => idea !== done))

      return { text: s.done(done.text) }
    }

    await $.store.set(key, [...ideas, { text: args, at: await $.clock.now(), isShown: false }])

    return { text: s.saved(ideas.length + 1) }
  })

  // The end of the turn is when an idea can be looked at without breaking the work.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const { key, ideas } = await load($)
      const fresh = ideas.filter(idea => !idea.isShown)

      if (fresh.length > 0) {
        $.ui.toast((await strings($)).toast(fresh.map(idea => idea.text)), { timeoutMs: TOAST_MS })
        await $.store.set(key, ideas.map(idea => ({ ...idea, isShown: true })))
      }
    }

    return next(e)
  })
}
