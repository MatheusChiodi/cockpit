import type { EngineInterface, Register, Timer } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('green-age-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TEST_COMMAND =
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\b(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|cypress\s+run)\b|\bpytest\b|\b(cargo|go|dotnet|mvn|gradle|\.\/gradlew|deno|bun)\s+test\b|\bclaude\s+plugin\s+test\b/

const MINUTE = 60000

const green: { at: number | undefined; edits: number; ticker: Timer | undefined; shown: string | undefined } = {
  at: undefined,
  edits: 0,
  ticker: undefined,
  shown: undefined,
}

const age = (ms: number): string => {
  const minutes = Math.floor(ms / MINUTE)

  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

// Writes the status line only when its text changed: a tick inside the same minute redraws nothing.
const draw = async ($: EngineInterface): Promise<void> => {
  if (green.at === undefined) {
    return
  }

  const elapsed = (await $.clock.now()) - green.at
  const s = await strings($)
  const when = elapsed < MINUTE ? s.now : s.ago(age(elapsed))
  const text = `${s.label} ${when}${green.edits > 0 ? ` · ${s.edits(green.edits)}` : ''}`

  if (text !== green.shown) {
    green.shown = text
    await show($, text)
  }
}

const watch = async <R extends { deny?: string; isError?: boolean }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const ran = await run()

  if (TEST_COMMAND.test(command) && ran.deny === undefined && ran.isError !== true) {
    green.at = await $.clock.now()
    green.edits = 0
    green.ticker ??= $.clock.every(30000, () => void draw($))
    await draw($)
  }

  return ran
}

const edited = async ($: EngineInterface, ran: { deny?: string; isError?: boolean }): Promise<void> => {
  if (green.at !== undefined && ran.deny === undefined && ran.isError !== true) {
    green.edits += 1
    await draw($)
  }
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    green.shown = undefined
    await show($, undefined)

    if (!(await isOff($))) {
      await draw($)
    }

    return set
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    await edited($, ran)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    await edited($, ran)

    return ran
  })
}
