import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TOAST_MS = 8000

const CODE = /\.(?:[cm]?[jt]sx?|py|java|kt|kts|go|rs|cs|vue|svelte)$/i
const TEST_FILE = /[.\-_](?:test|spec)\.|(?:^|[\\/])(?:tests?|__tests__)[\\/]|(?:^|[\\/])test_[^\\/]*$|Tests?\.(?:java|kt|cs)$/i

const TEST_COMMAND =
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\b(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|cypress\s+run)\b|\bpytest\b|\b(cargo|go|dotnet|mvn|gradle|\.\/gradlew|deno|bun)\s+test\b|\bclaude\s+plugin\s+test\b/

// What the turn that is running did: code files it changed and whether it ran any test.
const turn = { changed: new Set<string>(), ranTests: false }

const isMain = (e: unknown): boolean => (e as { agentId?: string }).agentId === undefined

const noteEdit = (path: string, e: unknown, ran: { deny?: string }): void => {
  if (isMain(e) && ran.deny === undefined && CODE.test(path) && !TEST_FILE.test(path)) {
    turn.changed.add(path)
  }
}

const noteCommand = (command: string, e: unknown, ran: { deny?: string }): void => {
  if (isMain(e) && ran.deny === undefined && TEST_COMMAND.test(command)) {
    turn.ranTests = true
  }
}

export const register: Register = on => {
  on('turn.start', (_, e, next) => {
    turn.changed.clear()
    turn.ranTests = false

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async (_, e, next) => {
    const ran = await next(e)
    noteEdit(e.file_path, e, ran)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_, e, next) => {
    const ran = await next(e)
    noteEdit(e.file_path, e, ran)

    return ran
  })

  on('tool.call', { tool: 'Bash' }, async (_, e, next) => {
    const ran = await next(e)
    noteCommand(e.command, e, ran)

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async (_, e, next) => {
    const ran = await next(e)
    noteCommand(e.command, e, ran)

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted && turn.changed.size > 0 && !turn.ranTests) {
      const s = await strings($)
      $.ui.toast(s.missing(turn.changed.size), { timeoutMs: TOAST_MS })
    }

    turn.changed.clear()
    turn.ranTests = false

    return next(e)
  })
}
