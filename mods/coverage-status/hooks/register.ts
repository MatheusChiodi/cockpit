import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('coverage-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TEST_COMMAND =
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\b(npx\s+)?(vitest|jest|mocha|ava|playwright\s+test|cypress\s+run)\b|\bpytest\b|\b(cargo|go|dotnet|mvn|gradle|\.\/gradlew|deno|bun)\s+test\b|\bclaude\s+plugin\s+test\b/

// Where a report puts the line coverage: istanbul/nyc/vitest/jest summary, coverage.py json.
const REPORTS: readonly { file: string; pick: (json: any) => unknown }[] = [
  { file: 'coverage/coverage-summary.json', pick: json => json?.total?.lines?.pct },
  { file: 'coverage.json', pick: json => json?.totals?.percent_covered },
]

// The percent of the previous reading, to show how far it moved.
const seen: { percent?: number } = {}

const read = async ($: EngineInterface): Promise<number | undefined> => {
  const root = await $.session.root()

  for (const report of REPORTS) {
    const path = `${root}/${report.file}`

    if (await $.fs.exists(path)) {
      const text = await $.fs.read(path).catch(() => undefined)
      const percent = report.pick(typeof text === 'string' ? JSON.parse(text) : undefined)

      if (typeof percent === 'number' && Number.isFinite(percent)) {
        return percent
      }
    }
  }

  return undefined
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const percent = await read($).catch(() => undefined)

  if (percent === undefined) {
    void show($, undefined)

    return
  }

  const s = await strings($)
  const delta = seen.percent === undefined ? 0 : Math.round(percent - seen.percent)
  const moved = delta === 0 ? '' : ` ${delta > 0 ? '↑' : '↓'}${Math.abs(delta)}`
  seen.percent = percent
  void show($, `${s.label} ${Math.round(percent)}%${moved}`)
}

const afterTests = async <R>(command: string, $: EngineInterface, run: () => Promise<R>): Promise<R> => {
  const ran = await run()

  if (TEST_COMMAND.test(command)) {
    await refresh($)
  }

  return ran
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    seen.percent = undefined
    await refresh($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => afterTests(e.command, $, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => afterTests(e.command, $, () => next(e)))
}
