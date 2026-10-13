import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

import type { Pending } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('uncommitted-band')

const pending = atom({ plugin: 'uncommitted-band', key: 'pending' } as const, null)

const MIN_MINUTES = 45

const span = (minutes: number): string =>
  minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`

const refresh = async ($: EngineInterface): Promise<void> => {
  const status = await $.process.run(['git', 'status', '--porcelain=v1'], { timeoutMs: 5000 }).catch(() => undefined)
  const log = await $.process.run(['git', 'log', '-1', '--format=%ct'], { timeoutMs: 5000 }).catch(() => undefined)
  const changed = status?.exitCode === 0 ? status.stdout.split('\n').filter(line => line !== '').length : 0
  const committedAt = log?.exitCode === 0 ? Number(log.stdout.trim()) * 1000 : 0
  const minutes = committedAt > 0 ? Math.floor(((await $.clock.now()) - committedAt) / 60000) : 0
  const found: Pending | null = changed > 0 && minutes >= MIN_MINUTES ? { changed, minutes } : null

  await update($, pending, held => (JSON.stringify(held) === JSON.stringify(found) ? held : found))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const found = await read($, pending)

    if (e.props.hasSurvey || (await isOff($)) || found === null) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'git',
      'commit',
      <Text wrap="truncate-end">
        <Text color="warning">
          {found.changed} arquivo{found.changed === 1 ? '' : 's'} sem commit
        </Text>
        <Text dimColor>  último há {span(found.minutes)}</Text>
      </Text>,
      below,
    )
  })
}
