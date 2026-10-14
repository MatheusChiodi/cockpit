import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('files-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const files = atom({ plugin: 'files-band', key: 'files' } as const, [])

const base = (path: string): string => path.split(/[\\/]/).at(-1) ?? path

// Most recent first, without repeats.
const touch = ($: EngineInterface, path: string) =>
  update($, files, list => [path, ...list.filter(held => held !== path)].slice(0, 200))

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await touch($, e.file_path)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await touch($, e.file_path)
    }

    return ran
  })

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await touch($, e.notebook_path)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, files)

    if (e.props.hasSurvey || (await isOff($)) || list.length === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)
    const shown = list.slice(0, 4).map(base)

    return row(
      ui,
      'session',
      s.label,
      <Text wrap="truncate-end">
        <Text color="warning">
          {s.changed(list.length)}
        </Text>
        {'  '}
        {shown.join('  ')}
        {list.length > shown.length && <Text dimColor>  +{list.length - shown.length}</Text>}
      </Text>,
      below,
    )
  })
}
