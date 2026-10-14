import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Reminder = { at: number; text: string }

const MAX_MINUTES = 24 * 60
const MAX_PENDING = 20
const WANTED = /^(\d+)\s+(\S[\s\S]*)$/

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const load = async ($: EngineInterface): Promise<Reminder[]> => {
  const held = await $.store.get('remind')

  return Array.isArray(held) ? (held as Reminder[]) : []
}

const fire = async ($: EngineInterface, item: Reminder): Promise<void> => {
  const held = await load($)
  await $.store.set('remind', held.filter(other => other.at !== item.at || other.text !== item.text))
  const s = await strings($)

  $.ui.toast(s.ring(item.text), { timeoutMs: 20000 })
  await $.ui.notify(item.text, { title: s.title }).catch(() => undefined)
}

// A reminder due while no session was open fires as soon as the next one starts.
const arm = async ($: EngineInterface, item: Reminder): Promise<void> => {
  const now = await $.clock.now()

  $.clock.after(Math.max(0, item.at - now), () => void fire($, item))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'remind', description: s.command, argumentHint: s.hint })

    if (e.isInteractive) {
      for (const item of await load($)) {
        await arm($, item)
      }
    }

    return next(e)
  })

  on('command.run', { command: 'remind' }, async ($, e) => {
    const s = await strings($)
    const wanted = WANTED.exec(e.args.trim())
    const minutes = Number(wanted?.[1])
    const pending = await load($)

    if (wanted === null || minutes < 1 || minutes > MAX_MINUTES) {
      return { text: s.usage(MAX_MINUTES) }
    }

    if (pending.length >= MAX_PENDING) {
      return { text: s.full(MAX_PENDING) }
    }

    const item: Reminder = { at: (await $.clock.now()) + minutes * 60000, text: (wanted[2] ?? '').trim() }
    await $.store.set('remind', [...pending, item])
    await arm($, item)

    return { text: s.set(minutes, item.text) }
  })
}
