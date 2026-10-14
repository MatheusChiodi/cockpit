import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Edit } from '../types'

const PANE = 'diff-pane'
const edits = atom({ plugin: 'diff-pane', key: 'edits' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const lines = (text: string): number => (text === '' ? 0 : text.split('\n').length)

const record = ($: EngineInterface, path: string, added: number, removed: number) =>
  update($, edits, list => [...list, { path, added, removed } satisfies Edit].slice(-300))

const short = (path: string, width: number): string =>
  path.length <= width ? path : `…${path.slice(path.length - width + 1)}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'edits', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'edits' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await record($, e.file_path, lines(e.new_string), lines(e.old_string))
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await record($, e.file_path, lines(e.content), 0)
    }

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = await read($, edits)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const width = Math.max(16, e.props.bodyColumns - 14)
    const added = list.reduce((sum, edit) => sum + edit.added, 0)
    const removed = list.reduce((sum, edit) => sum + edit.removed, 0)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length, added, removed), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(edit => (
            <Text wrap="truncate-end">
              <Text color="success">{`+${edit.added}`.padStart(5)}</Text>{' '}
              <Text color="error">{`−${edit.removed}`.padStart(5)}</Text> {short(edit.path, width)}
            </Text>
          ))}
      </Box>
    )
  })
}
