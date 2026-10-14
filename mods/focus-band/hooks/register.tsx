import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import { row, meter } from './kit'
import { STRINGS } from './strings'

import type { Focus } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('focus-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const focus = atom({ plugin: 'focus-band', key: 'focus' } as const, null)

const running: { ticker: Timer | undefined; endsAt: number; total: number } = { ticker: undefined, endsAt: 0, total: 0 }

const stop = async ($: EngineInterface): Promise<void> => {
  running.ticker?.cancel()
  running.ticker = undefined
  await update($, focus, () => null)
}

const tick = async ($: EngineInterface): Promise<void> => {
  const left = Math.ceil((running.endsAt - (await $.clock.now())) / 60000)

  if (left > 0) {
    const now: Focus = { left, total: running.total }
    await update($, focus, held => (held?.left === left ? held : now))

    return
  }

  const s = await strings($)
  await stop($)
  $.ui.toast(s.done, { timeoutMs: 15000 })
  await $.ui.notify(s.done, { title: s.notifyTitle }).catch(() => undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'focus', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'focus' }, async ($, e) => {
    const s = await strings($)
    const wanted = e.args.trim().toLowerCase()
    const minutes = wanted === '' ? 25 : Number(wanted)

    if (wanted === 'stop') {
      await stop($)

      return { text: s.cancelled }
    }

    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
      return { text: s.usage }
    }

    await stop($)
    running.total = minutes
    running.endsAt = (await $.clock.now()) + minutes * 60000
    running.ticker = $.clock.every(15000, () => void tick($))
    await tick($)

    return { text: s.started(minutes) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const now = await read($, focus)

    if (e.props.hasSurvey || (await isOff($)) || now === null) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'daily',
      s.label,
      <Text>
        {meter(ui, ((now.total - now.left) / now.total) * 100, 24, 'remember')} <Text bold>{s.left(now.left)}</Text>
        <Text dimColor>{s.of(now.total)}</Text>
      </Text>,
      below,
    )
  })
}
