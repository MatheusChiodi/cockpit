import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Failure } from '../types'

const PANE = 'error-pane'
const failures = atom({ plugin: 'error-pane', key: 'failures' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The arguments that say best what a call was about, first one present wins.
const KEYS = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description'] as const

const summarize = (input: Record<string, unknown>): string => {
  for (const key of KEYS) {
    const value = input[key]

    if (typeof value === 'string' && value !== '') {
      return value.replace(/\s+/g, ' ').slice(0, 120)
    }
  }

  return ''
}

// The first line that says something: not blank, not a bare tag or fence.
const firstLine = (text: string): string =>
  text
    .split('\n')
    .map(line => line.trim())
    .find(line => line !== '' && !/^[<`]/.test(line))
    ?.slice(0, 200) ?? ''

const record = ($: EngineInterface, tool: string, input: Record<string, unknown>, message: string) =>
  update($, failures, list => [...list, { tool, input: summarize(input), message } satisfies Failure].slice(-200))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'errors', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'errors' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny !== undefined) {
      await record($, String(e.tool), e as unknown as Record<string, unknown>, firstLine(ran.deny))
    } else if (ran.isError === true) {
      await record($, String(e.tool), e as unknown as Record<string, unknown>, firstLine(ran.text ?? ''))
    }

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = await read($, failures)
    const room = Math.max(1, Math.floor(((e.viewport?.rows ?? 24) - 6) / 2))
    const width = Math.max(16, e.props.bodyColumns - 4)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(failure => (
            <Box flexDirection="column">
              <Text wrap="truncate-end">
                <Text color="error" bold>
                  ✗
                </Text>{' '}
                <Text bold>{failure.tool}</Text> <Text dimColor>{failure.input.slice(0, width)}</Text>
              </Text>
              <Text color="error" wrap="truncate-end">
                {'  '}
                {(failure.message === '' ? s.unknown : failure.message).slice(0, width)}
              </Text>
            </Box>
          ))}
      </Box>
    )
  })
}
