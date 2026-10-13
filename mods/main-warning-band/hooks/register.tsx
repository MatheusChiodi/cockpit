import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('main-warning-band')

const branch = atom({ plugin: 'main-warning-band', key: 'branch' } as const, '')

const PROTECTED = new Set(['main', 'master', 'production', 'prod'])

const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 5000 })
    .catch(() => undefined)
  const found = ran?.exitCode === 0 ? ran.stdout.trim() : ''

  await update($, branch, held => (held === found ? held : found))
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

  // Só avisa: quem quiser bloquear de verdade usa o main-branch-guard.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const current = await read($, branch)

    if (e.props.hasSurvey || (await isOff($)) || !PROTECTED.has(current)) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'git',
      'branch',
      <Text wrap="truncate-end">
        <Text color="error" bold>
          {current}
        </Text>
        <Text color="error"> é protegida</Text>
        <Text dimColor>  crie outra antes de alterar: git switch -c nome</Text>
      </Text>,
      below,
    )
  })
}
