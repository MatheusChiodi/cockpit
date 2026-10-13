import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

import type { Trouble } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('conflict-band')

const trouble = atom({ plugin: 'conflict-band', key: 'trouble' } as const, null)

const OPERATIONS: readonly (readonly [string, string])[] = [
  ['MERGE_HEAD', 'merge'],
  ['REBASE_HEAD', 'rebase'],
  ['CHERRY_PICK_HEAD', 'cherry-pick'],
  ['REVERT_HEAD', 'revert'],
]

const UNMERGED = /^(UU|AA|DD|AU|UA|DU|UD) /

const refresh = async ($: EngineInterface): Promise<void> => {
  const status = await $.process.run(['git', 'status', '--porcelain=v1'], { timeoutMs: 5000 }).catch(() => undefined)

  if (status === undefined || status.exitCode !== 0) {
    await update($, trouble, () => null)

    return
  }

  let operation = ''

  for (const [ref, name] of OPERATIONS) {
    const ran = await $.process.run(['git', 'rev-parse', '-q', '--verify', ref], { timeoutMs: 5000 }).catch(() => undefined)

    if (ran?.exitCode === 0) {
      operation = name
      break
    }
  }

  const conflicts = status.stdout.split('\n').filter(line => UNMERGED.test(line)).length
  const found: Trouble | null = operation === '' && conflicts === 0 ? null : { operation, conflicts }

  await update($, trouble, held => (JSON.stringify(held) === JSON.stringify(found) ? held : found))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(30000, () => void refresh($))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const found = await read($, trouble)

    if (e.props.hasSurvey || (await isOff($)) || found === null) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'git',
      'conflito',
      <Text wrap="truncate-end">
        <Text color="error" bold>
          {found.operation === '' ? 'arquivos em conflito' : `${found.operation} em andamento`}
        </Text>
        <Text dimColor>
          {'  '}
          {found.conflicts > 0 ? `${found.conflicts} arquivo${found.conflicts === 1 ? '' : 's'} para resolver` : 'nada pendente, falta concluir'}
        </Text>
      </Text>,
      below,
    )
  })
}
