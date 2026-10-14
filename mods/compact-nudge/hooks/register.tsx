import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row, meter, toneOf } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('compact-nudge')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const percent = atom({ plugin: 'compact-nudge', key: 'percent' } as const, 0)

const THRESHOLD = 75

const compact = async ($: EngineInterface): Promise<void> => {
  const s = await strings($)
  // Rejects while a turn runs: just try again later.
  const done = await $.session.compact({}).catch(() => undefined)

  $.ui.toast(done === undefined ? s.failed : s.done)
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const now = e.context.percent ?? 0
    await update($, percent, held => (held === now ? held : now))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const used = await read($, percent)

    if (e.props.hasSurvey || (await isOff($)) || used < THRESHOLD) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Button, Text } = ui
    const s = await strings($)

    return row(
      ui,
      'session',
      s.label,
      [
        <Text>
          {meter(ui, used, 14)} <Text color={toneOf(used)}>{used}%</Text>
          <Text dimColor>  {s.almostFull}  </Text>
        </Text>,
        <Button key="compact" label={s.button} variant="primary" onPress={() => compact($)} />,
      ],
      below,
    )
  })
}
