import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('turn-files-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const files = atom({ plugin: 'turn-files-band', key: 'files' } as const, [])

const SHOWN = 3

const name = (path: string): string => path.split(/[\\/]/).pop() ?? path

// A file read and then edited counts once, as edited.
const touch = async ($: EngineInterface, path: string, isEdited: boolean): Promise<void> => {
  const held = await read($, files)
  const known = held.find(item => item.path === path)

  if (known !== undefined && (known.isEdited || !isEdited)) {
    return
  }

  await update($, files, items => [...items.filter(item => item.path !== path), { path, isEdited }])
}

export const register: Register = on => {
  on('turn.start', async ($, e, next) => {
    if ((await read($, files)).length > 0) {
      await update($, files, () => [])
    }

    return next(e)
  })

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined) {
      await touch($, e.file_path, false)
    }

    return ran
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined && ran.isError !== true) {
      await touch($, e.file_path, true)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined && ran.isError !== true) {
      await touch($, e.file_path, true)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const items = await read($, files)

    if (e.props.hasSurvey || (await isOff($)) || items.length === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)
    const edited = items.filter(item => item.isEdited)
    const names = edited.slice(-SHOWN).map(item => name(item.path))
    const hidden = edited.length - names.length

    return row(
      ui,
      'session',
      s.label,
      <Text wrap="truncate-end">
        <Text>{s.read(items.length - edited.length)}</Text>
        <Text bold>  {s.edited(edited.length)}</Text>
        {names.length > 0 && (
          <Text dimColor>
            {'  '}
            {names.join('  ')}
            {hidden > 0 ? `  ${s.more(hidden)}` : ''}
          </Text>
        )}
      </Text>,
      below,
    )
  })
}
