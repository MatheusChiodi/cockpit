import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('goal-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const goal = atom({ plugin: 'goal-band', key: 'goal' } as const, '')

const keyOf = async ($: EngineInterface): Promise<string> => `goal:${await $.session.root()}`

const held = async ($: EngineInterface): Promise<string> => {
  const value = await $.store.get(await keyOf($))

  return typeof value === 'string' ? value : ''
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'goal', description: s.command, argumentHint: s.hint })
    const text = await held($)
    await update($, goal, () => text)

    return next(e)
  })

  on('command.run', { command: 'goal' }, async ($, e) => {
    const s = await strings($)
    const text = e.args.trim()

    if (text === '') {
      const current = await read($, goal)

      return { text: current === '' ? s.none : s.current(current) }
    }

    const next = text === 'clear' ? '' : text.slice(0, 200)
    await $.store.set(await keyOf($), next)
    await update($, goal, () => next)

    return { text: next === '' ? s.removed : s.pinned }
  })

  // The goal also enters the system prompt, so Claude does not drift from it.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const text = await held($)

    return text === ''
      ? composed
      : {
          sections: [
            ...composed.sections,
            {
              id: 'goal-band:goal',
              text: `# The user's current goal\n${text}\nKeep the work aligned with this goal and say so if a request drifts from it.`,
              scope: 'session',
            },
          ],
        }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const text = await read($, goal)

    if (e.props.hasSurvey || (await isOff($)) || text === '') {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'daily',
      s.label,
      <Text bold wrap="truncate-end">
        {text}
      </Text>,
      below,
    )
  })
}
