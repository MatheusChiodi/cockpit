import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row, INDENT } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('pin-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const pins = atom({ plugin: 'pin-band', key: 'pins' } as const, [])

const MAX = 4

const keyOf = async ($: EngineInterface): Promise<string> => `pins:${await $.session.root()}`

// Short reminders per project: the store keeps them between sessions, the state draws them.
const save = async ($: EngineInterface, list: string[]): Promise<void> => {
  await update($, pins, () => list)
  await $.store.set(await keyOf($), list)
}

const restore = async ($: EngineInterface): Promise<void> => {
  const held = await $.store.get(await keyOf($))
  const list = Array.isArray(held) ? held.filter((pin): pin is string => typeof pin === 'string') : []
  await update($, pins, () => list)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'pin', description: s.command(MAX), argumentHint: s.hint })
    await restore($)

    return next(e)
  })

  on('command.run', { command: 'pin' }, async ($, e) => {
    const s = await strings($)
    const text = e.args.trim()
    const [action, value] = text.split(/\s+/)
    const list = await read($, pins)

    if (text === '') {
      return { text: s.usage }
    }

    if (text === 'clear') {
      await save($, [])

      return { text: s.cleared }
    }

    if (action === 'rm' && value !== undefined) {
      const index = Number(value) - 1

      if (list[index] === undefined) {
        return { text: s.missing(value) }
      }

      await save($, list.filter((_, at) => at !== index))

      return { text: s.removed(index + 1) }
    }

    if (list.length >= MAX) {
      return { text: s.full(MAX) }
    }

    await save($, [...list, text.slice(0, 100)])

    return { text: s.pinned(list.length + 1) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, pins)

    if (e.props.hasSurvey || (await isOff($)) || list.length === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const [first = '', ...rest] = list

    return (
      <Box flexDirection="column">
        {row(
          ui,
          'daily',
          s.label,
          <Text wrap="truncate-end">
            <Text dimColor>1 </Text>
            {first}
          </Text>,
          below,
        )}
        {rest.map((pin, index) => (
          <Text wrap="truncate-end">
            {INDENT}
            <Text dimColor>{index + 2} </Text>
            {pin}
          </Text>
        ))}
      </Box>
    )
  })
}
