import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Mood } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('terminal-pet')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const mood = atom({ plugin: 'terminal-pet', key: 'mood' } as const, 'idle')

const FACES: Record<Mood, string> = {
  idle: '(•ᴗ•)',
  working: '(•̀ᴗ•́)',
  happy: '(＾▽＾)',
  sad: '(╥﹏╥)',
  sleepy: '(－_－) zZ',
}

const SLEEP_AFTER_MS = 5 * 60000

const state = { failed: false, idleSince: 0 }

const feel = ($: EngineInterface, next: Mood) => update($, mood, held => (held === next ? held : next))

const doze = async ($: EngineInterface): Promise<void> => {
  if (state.idleSince > 0 && (await $.clock.now()) - state.idleSince >= SLEEP_AFTER_MS) {
    await feel($, 'sleepy')
  }
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    $.clock.every(30000, () => void doze($))

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    state.failed = false
    state.idleSince = 0
    await feel($, 'working')

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined && ran.isError === true) {
      state.failed = true
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      state.idleSince = await $.clock.now()
      await feel($, e.reason !== 'answer' || state.failed ? 'sad' : 'happy')
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const current = await read($, mood)
    const face = FACES[current]

    if (e.props.hasSurvey || (await isOff($)) || face === undefined) {
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
        <Text color="remember">{face}</Text>
        <Text dimColor>  {s[current]}</Text>
      </Text>,
      below,
    )
  })
}
