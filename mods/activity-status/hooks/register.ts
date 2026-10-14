import type { EngineInterface, Register } from 'claude-code'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('activity-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const base = (path: string): string => path.split(/[\\/]/).at(-1) ?? path

// What sums up each call: the command, the file, the searched pattern or the description.
const detail = (input: Readonly<Record<string, unknown>>): string => {
  const pick = (key: string): string | undefined =>
    typeof input[key] === 'string' ? (input[key] as string) : undefined
  const path = pick('file_path') ?? pick('notebook_path')

  return (
    pick('command')?.replace(/\s+/g, ' ') ??
    (path === undefined ? undefined : base(path)) ??
    pick('pattern') ??
    pick('description') ??
    pick('url') ??
    pick('query') ??
    ''
  ).slice(0, 56)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  // Parallel calls: the status line shows the most recent one still running.
  const running = new Map<string, string>()

  on('tool.call', async ($, e, next) => {
    // Main loop only: subagents have their own line.
    if (e.agentId !== undefined) {
      return next(e)
    }

    const what = detail(e as unknown as Readonly<Record<string, unknown>>)
    running.set(e.tool_use_id, `▸ ${String(e.tool)}${what === '' ? '' : ` ${what}`}`)
    void show($, [...running.values()].at(-1))

    try {
      return await next(e)
    } finally {
      running.delete(e.tool_use_id)
      void show($, [...running.values()].at(-1))
    }
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      running.clear()
      void show($, undefined)
    }

    return next(e)
  })
}
