import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Entry, Kind } from '../types'

const PANE = 'timeline'
const entries = atom({ plugin: 'timeline', key: 'entries' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MARK: Record<Kind, string> = { prompt: '›', tool: '●', fail: '✗', turn: '✓' }

// The arguments that say best what a call was about, first one present wins.
const KEYS = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description'] as const

const summarize = (input: Record<string, unknown>): string => {
  for (const key of KEYS) {
    const value = input[key]

    if (typeof value === 'string' && value !== '') {
      return value.replace(/\s+/g, ' ').slice(0, 100)
    }
  }

  return ''
}

const record = async ($: EngineInterface, kind: Kind, text: string): Promise<void> => {
  const at = await $.clock.now()
  await update($, entries, list => [...list, { at, kind, text } satisfies Entry].slice(-300))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'timeline', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'timeline' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('prompt.submit', async ($, e, next) => {
    await record($, 'prompt', e.text.replace(/\s+/g, ' ').trim().slice(0, 120))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined) {
      const failed = ran.deny !== undefined || ran.isError === true
      await record($, failed ? 'fail' : 'tool', `${String(e.tool)} ${summarize(e as unknown as Record<string, unknown>)}`.trim())
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const s = await strings($)
      await record($, 'turn', s.turnEnded((e.durationMs / 1000).toFixed(1), s.reasons[e.reason] ?? e.reason))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = await read($, entries)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const width = Math.max(12, e.props.bodyColumns - 13)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list.slice(-room).map(entry => (
          <Text wrap="truncate-end">
            <Text dimColor>{new Date(entry.at).toLocaleTimeString(s.locale, { hour12: false })}</Text>{' '}
            <Text color={entry.kind === 'fail' ? 'error' : entry.kind === 'turn' ? 'success' : entry.kind === 'prompt' ? 'claude' : 'inactive'} bold>
              {MARK[entry.kind]}
            </Text>{' '}
            <Text color={entry.kind === 'fail' ? 'error' : undefined} dimColor={entry.kind === 'tool'}>
              {entry.text.slice(0, width)}
            </Text>
          </Text>
        ))}
      </Box>
    )
  })
}
