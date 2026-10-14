import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('main-warning-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

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

  // Only warns: whoever wants a real block uses main-branch-guard.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const current = await read($, branch)

    if (e.props.hasSurvey || (await isOff($)) || !PROTECTED.has(current)) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'git',
      s.label,
      <Text wrap="truncate-end">
        <Text color="error" bold>
          {current}
        </Text>
        <Text color="error">{s.protected}</Text>
        <Text dimColor>  {s.hint}</Text>
      </Text>,
      below,
    )
  })
}
