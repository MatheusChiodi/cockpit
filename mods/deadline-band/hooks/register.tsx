import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Countdown } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('deadline-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Deadline = { at: number; label: string }

const countdown = atom({ plugin: 'deadline-band', key: 'countdown' } as const, null)

const keyOf = async ($: EngineInterface): Promise<string> => `deadline:${await $.session.root()}`

const span = (minutes: number): string =>
  minutes >= 1440
    ? `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
    : minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
      : `${minutes}min`

// The deadline is per project and lives in the store; the state keeps only the text already computed for drawing.
const refresh = async ($: EngineInterface): Promise<void> => {
  const held = await $.store.get(await keyOf($))
  const deadline = typeof held === 'object' && held !== null ? (held as Deadline) : undefined

  if (deadline === undefined) {
    await update($, countdown, () => null)

    return
  }

  const s = await strings($)
  const minutes = Math.round((deadline.at - (await $.clock.now())) / 60000)
  const now: Countdown = {
    label: deadline.label === '' ? s.defaultLabel : deadline.label,
    left: minutes >= 0 ? s.inSpan(span(minutes)) : s.overdue(span(-minutes)),
    date: new Date(deadline.at).toLocaleDateString(s.locale, { day: '2-digit', month: '2-digit' }),
    tone: minutes < 0 ? 'error' : minutes < 1440 ? 'warning' : 'text',
  }

  await update($, countdown, was => (was?.left === now.left && was.label === now.label ? was : now))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'deadline', description: s.command, argumentHint: s.hint })
    await refresh($)
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'deadline' }, async ($, e) => {
    const s = await strings($)
    const text = e.args.trim()

    if (text === 'clear') {
      await $.store.delete(await keyOf($))
      await refresh($)

      return { text: s.removed }
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?\s*(.*)$/.exec(text)

    if (match === null) {
      return { text: s.usage }
    }

    const [, year, month, day, hour = '18', minute = '00', label = ''] = match
    const at = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime()
    const deadline: Deadline = { at, label: label.slice(0, 60) }
    await $.store.set(await keyOf($), deadline)
    await refresh($)

    return { text: s.set(deadline.label === '' ? s.defaultLabel : deadline.label, new Date(at).toLocaleString(s.locale)) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const now = await read($, countdown)

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
      <Text wrap="truncate-end">
        <Text color={now.tone} bold>
          {now.left}
        </Text>
        {'  '}
        {now.label}
        <Text dimColor>  {now.date}</Text>
      </Text>,
      below,
    )
  })
}
