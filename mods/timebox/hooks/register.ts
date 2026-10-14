import type { EngineInterface, Register, Timer } from 'claude-code'

import { STRINGS } from './strings'

type Box = { startedAt: number; endsAt: number; what: string }

const TICK_MS = 15000
// The share of the box after which the warning toast comes.
const WARN_AT = 0.8
const MAX_MINUTES = 480
const WANTED = /^(\d+)\s+(\S[\s\S]*)$/

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: a reload cancels the timer along with the old environment.
const live: { ticker: Timer | undefined; box: Box | undefined; isWarned: boolean } = {
  ticker: undefined,
  box: undefined,
  isWarned: false,
}

const stop = async ($: EngineInterface): Promise<void> => {
  live.ticker?.cancel()
  live.ticker = undefined
  live.box = undefined
  $.ui.status(undefined)
  await $.store.delete('timebox')
}

const tick = async ($: EngineInterface): Promise<void> => {
  const box = live.box

  if (box === undefined) {
    return
  }

  const now = await $.clock.now()
  const s = await strings($)
  const left = box.endsAt - now

  if (left <= 0) {
    await stop($)
    $.ui.toast(s.over(box.what), { timeoutMs: 20000 })
    await $.ui.notify(s.over(box.what), { title: s.title }).catch(() => undefined)

    return
  }

  const minutesLeft = Math.ceil(left / 60000)

  if (!live.isWarned && now - box.startedAt >= (box.endsAt - box.startedAt) * WARN_AT) {
    live.isWarned = true
    $.ui.toast(s.warn(minutesLeft, box.what), { timeoutMs: 15000 })
  }

  $.ui.status(s.status(minutesLeft, box.what))
}

const begin = async ($: EngineInterface, box: Box): Promise<void> => {
  const now = await $.clock.now()
  live.ticker?.cancel()
  live.box = box
  // A box taken up again past 80% does not warn a second time.
  live.isWarned = now - box.startedAt >= (box.endsAt - box.startedAt) * WARN_AT
  live.ticker = $.clock.every(TICK_MS, () => void tick($))
  await tick($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'timebox', description: s.command, argumentHint: s.hint })
    const held = await $.store.get('timebox')

    if (e.isInteractive && typeof held === 'object' && held !== null) {
      const box = held as Box

      if (box.endsAt > (await $.clock.now())) {
        await begin($, box)
      } else {
        await $.store.delete('timebox')
      }
    }

    return next(e)
  })

  on('command.run', { command: 'timebox' }, async ($, e) => {
    const s = await strings($)
    const args = e.args.trim()

    if (args.toLowerCase() === 'done') {
      const box = live.box

      if (box === undefined) {
        return { text: s.none }
      }

      const spent = Math.round(((await $.clock.now()) - box.startedAt) / 60000)
      await stop($)

      return { text: s.closed(spent, Math.round((box.endsAt - box.startedAt) / 60000), box.what) }
    }

    const wanted = WANTED.exec(args)
    const minutes = Number(wanted?.[1])

    if (wanted === null || minutes < 1 || minutes > MAX_MINUTES) {
      return { text: live.box === undefined ? s.usage(MAX_MINUTES) : s.running(live.box.what) }
    }

    const startedAt = await $.clock.now()
    const box: Box = { startedAt, endsAt: startedAt + minutes * 60000, what: (wanted[2] ?? '').trim() }
    await $.store.set('timebox', box)
    await begin($, box)

    return { text: s.started(minutes, box.what) }
  })
}
