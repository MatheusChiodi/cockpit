import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TOAST_MS = 8000
const COMMAND_CHARS = 60

const TEST_COMMAND =
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\b(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|cypress\s+run)\b|\bpytest\b|\b(cargo|go|dotnet|mvn|gradle|\.\/gradlew|deno|bun)\s+test\b|\bclaude\s+plugin\s+test\b/

// The command of the latest test run while it is red; undefined once a run passes.
const red: { command?: string } = {}

const short = (command: string): string => {
  const line = command.trim().split('\n')[0] ?? ''

  return line.length > COMMAND_CHARS ? `${line.slice(0, COMMAND_CHARS - 1)}…` : line
}

const watch = async <R extends { deny?: string; isError?: boolean; result?: unknown }>(
  command: string,
  isMain: boolean,
  run: () => Promise<R>,
): Promise<R> => {
  const ran = await run()
  const interrupted = (ran.result as { interrupted?: boolean } | undefined)?.interrupted === true

  if (isMain && TEST_COMMAND.test(command) && ran.deny === undefined && !interrupted) {
    red.command = ran.isError === true ? short(command) : undefined
  }

  return ran
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, (_, e, next) =>
    watch(e.command, (e as { agentId?: string }).agentId === undefined, () => next(e)),
  )

  on('tool.call', { tool: 'PowerShell' }, (_, e, next) =>
    watch(e.command, (e as { agentId?: string }).agentId === undefined, () => next(e)),
  )

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted && red.command !== undefined) {
      const s = await strings($)
      $.ui.toast(s.failing(red.command), { timeoutMs: TOAST_MS })
    }

    return next(e)
  })
}
