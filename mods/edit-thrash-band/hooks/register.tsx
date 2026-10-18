import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Thrash } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('edit-thrash-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const thrash = atom({ plugin: 'edit-thrash-band', key: 'thrash' } as const, [])

// Two edits to a file are a fix and a touch-up; the third is a loop.
const THRESHOLD = 3
const SHOWN = 2

const edits: { counts: Map<string, number> } = { counts: new Map() }

const name = (path: string): string => path.split(/[\\/]/).pop() ?? path

const edited = async ($: EngineInterface, path: string): Promise<void> => {
  const count = (edits.counts.get(path) ?? 0) + 1
  edits.counts.set(path, count)

  if (count >= THRESHOLD) {
    const looping: Thrash[] = [...edits.counts]
      .filter(([, times]) => times >= THRESHOLD)
      .map(([file, times]) => ({ path: file, count: times }))
      .sort((a, b) => b.count - a.count)

    await update($, thrash, () => looping)
  }
}

export const register: Register = on => {
  on('turn.start', async ($, e, next) => {
    edits.counts.clear()

    if ((await read($, thrash)).length > 0) {
      await update($, thrash, () => [])
    }

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined && ran.isError !== true) {
      await edited($, e.file_path)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined && ran.isError !== true) {
      await edited($, e.file_path)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const looping = await read($, thrash)

    if (e.props.hasSurvey || (await isOff($)) || looping.length === 0) {
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
        {looping.slice(0, SHOWN).map(item => (
          <Text key={item.path} color="warning" bold>
            {name(item.path)} x{item.count}
            {'  '}
          </Text>
        ))}
        <Text dimColor>{s.tail}</Text>
      </Text>,
      below,
    )
  })
}
