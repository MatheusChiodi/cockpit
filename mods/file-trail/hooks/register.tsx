import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Touch, TouchKind } from '../types'

const PANE = 'file-trail'
const touches = atom({ plugin: 'file-trail', key: 'touches' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MARK: Record<TouchKind, string> = { read: 'R', edit: 'M', write: 'W' }
const RANK: Record<TouchKind, number> = { read: 0, edit: 1, write: 2 }

const record = ($: EngineInterface, path: string, kind: TouchKind) =>
  update($, touches, list => {
    const held = list.find(touch => touch.path === path)
    const next: Touch = {
      path,
      kind: held !== undefined && RANK[held.kind] > RANK[kind] ? held.kind : kind,
      count: (held?.count ?? 0) + 1,
    }

    return [...list.filter(touch => touch.path !== path), next].slice(-300)
  })

const short = (path: string, width: number): string =>
  path.length <= width ? path : `…${path.slice(path.length - width + 1)}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'trail', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'trail' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.title })

    return { text: s.opened }
  })

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await record($, e.file_path, 'read')
    }

    return ran
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await record($, e.file_path, 'edit')
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await record($, e.file_path, 'write')
    }

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await strings($)
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const list = await read($, touches)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const width = Math.max(16, e.props.bodyColumns - 10)
    const changed = list.filter(touch => touch.kind !== 'read').length

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.label, s.summary(list.length, changed), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(touch => (
            <Text dimColor={touch.kind === 'read'} wrap="truncate-end">
              <Text color={touch.kind === 'read' ? 'inactive' : touch.kind === 'write' ? 'success' : 'warning'} bold>
                {MARK[touch.kind]}
              </Text>{' '}
              <Text dimColor>{String(touch.count).padStart(2)}×</Text> {short(touch.path, width)}
            </Text>
          ))}
      </Box>
    )
  })
}
