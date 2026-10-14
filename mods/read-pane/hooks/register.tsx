import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

const PANE = 'read-pane'
const readings = atom({ plugin: 'read-pane', key: 'readings' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// A file read this many times is context paid for more than once.
const WASTED = 3

const record = ($: EngineInterface, path: string) =>
  update($, readings, list =>
    list.some(held => held.path === path)
      ? list.map(held => (held.path === path ? { ...held, count: held.count + 1 } : held))
      : [...list, { path, count: 1 }].slice(-300),
  )

const short = (path: string, width: number): string =>
  path.length <= width ? path : `…${path.slice(path.length - width + 1)}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'reads', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'reads' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await record($, e.file_path)
    }

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = [...(await read($, readings))].sort((a, b) => b.count - a.count)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const wasted = list.filter(reading => reading.count >= WASTED).length
    const width = Math.max(12, e.props.bodyColumns - 10)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length, wasted), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list.slice(0, room).map(reading => {
          const isWasted = reading.count >= WASTED

          return (
            <Text wrap="truncate-end">
              <Text color={isWasted ? 'warning' : 'inactive'} bold={isWasted}>{`${reading.count}×`.padStart(4)}</Text>{' '}
              <Text color={isWasted ? 'warning' : undefined}>{short(reading.path, width - (isWasted ? s.wasted.length + 1 : 0))}</Text>
              {isWasted && <Text color="warning"> {s.wasted}</Text>}
            </Text>
          )
        })}
      </Box>
    )
  })
}
