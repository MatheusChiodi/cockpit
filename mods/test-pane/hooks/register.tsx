import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

const PANE = 'test-pane'
const runs = atom({ plugin: 'test-pane', key: 'runs' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TEST_COMMAND =
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\b(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|cypress\s+run)\b|\bpytest\b|\b(cargo|go|dotnet|mvn|gradle|\.\/gradlew|deno|bun)\s+test\b|\bclaude\s+plugin\s+test\b/

const took = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`)

const watch = async <R extends { deny?: string; isError?: boolean }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  if (!TEST_COMMAND.test(command)) {
    return run()
  }

  const startedAt = await $.clock.now()
  const ran = await run()
  const endedAt = await $.clock.now()

  if (ran.deny === undefined) {
    const entry = { command: command.split('\n')[0] ?? command, ok: ran.isError !== true, ms: endedAt - startedAt, at: endedAt }
    await update($, runs, list => [...list, entry].slice(-100))
  }

  return ran
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'testlog', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'testlog' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Test log' })

    return { text: (await strings($)).opened }
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const list = await read($, runs)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const failed = list.filter(one => !one.ok).length

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length, failed), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(one => (
            <Text wrap="truncate-end">
              <Text color={one.ok ? 'success' : 'error'}>{one.ok ? '✓' : '✗'}</Text>{' '}
              <Text dimColor>
                {new Date(one.at).toLocaleTimeString(s.locale, { hour: '2-digit', minute: '2-digit' })}
              </Text>{' '}
              <Text bold>{took(one.ms).padStart(6)}</Text> {one.command}
            </Text>
          ))}
      </Box>
    )
  })
}
