import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Countdown } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('deadline-band')

type Deadline = { at: number; label: string }

const countdown = atom({ plugin: 'deadline-band', key: 'countdown' } as const, null)

const keyOf = async ($: EngineInterface): Promise<string> => `deadline:${await $.session.root()}`

const span = (minutes: number): string =>
  minutes >= 1440
    ? `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
    : minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
      : `${minutes}min`

// O prazo é por projeto e fica no store; o state guarda só o texto já calculado para desenhar.
const refresh = async ($: EngineInterface): Promise<void> => {
  const held = await $.store.get(await keyOf($))
  const deadline = typeof held === 'object' && held !== null ? (held as Deadline) : undefined

  if (deadline === undefined) {
    await update($, countdown, () => null)

    return
  }

  const minutes = Math.round((deadline.at - (await $.clock.now())) / 60000)
  const now: Countdown = {
    label: deadline.label,
    left: minutes >= 0 ? `em ${span(minutes)}` : `atrasado ${span(-minutes)}`,
    date: new Date(deadline.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    tone: minutes < 0 ? 'error' : minutes < 1440 ? 'warning' : 'text',
  }

  await update($, countdown, was => (was?.left === now.left && was.label === now.label ? was : now))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'deadline',
      description: 'Contagem regressiva fixa para um prazo do projeto; /deadline clear remove',
      argumentHint: 'AAAA-MM-DD [HH:MM] <descrição> | clear',
    })
    await refresh($)
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'deadline' }, async ($, e) => {
    const text = e.args.trim()

    if (text === 'clear') {
      await $.store.delete(await keyOf($))
      await refresh($)

      return { text: 'Prazo removido.' }
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?\s*(.*)$/.exec(text)

    if (match === null) {
      return { text: 'Uso: /deadline AAAA-MM-DD [HH:MM] <descrição> | clear' }
    }

    const [, year, month, day, hour = '18', minute = '00', label = ''] = match
    const at = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime()
    const deadline: Deadline = { at, label: label === '' ? 'prazo' : label.slice(0, 60) }
    await $.store.set(await keyOf($), deadline)
    await refresh($)

    return { text: `Prazo "${deadline.label}" fixado para ${new Date(at).toLocaleString('pt-BR')}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const now = await read($, countdown)

    if (e.props.hasSurvey || (await isOff($)) || now === null) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        <Text color={now.tone} wrap="truncate-end">
          ⏰ {now.label} {now.left} <Text dimColor>({now.date})</Text>
        </Text>
      </Box>
    )
  })
}
