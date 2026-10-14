import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('session-diff-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const diff = atom({ plugin: 'session-diff-band', key: 'diff' } as const, { added: 0, removed: 0, edits: 0 })

const lines = (text: string): number => (text === '' ? 0 : text.split('\n').length)

const count = ($: EngineInterface, added: number, removed: number) =>
  update($, diff, held => ({ added: held.added + added, removed: held.removed + removed, edits: held.edits + 1 }))

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await count($, lines(e.new_string), lines(e.old_string))
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await count($, lines(e.content), 0)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const total = await read($, diff)

    if (e.props.hasSurvey || (await isOff($)) || total.edits === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'session',
      s.label,
      <Text wrap="truncate-end">
        <Text color="success">+{total.added}</Text> <Text color="error">−{total.removed}</Text>
        <Text dimColor>
          {'  '}
          {s.lines(total.edits)}
        </Text>
      </Text>,
      below,
    )
  })
}
