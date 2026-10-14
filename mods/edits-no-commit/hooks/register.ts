import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// Both must hold: this many edits, over at least this long, with no commit between.
const MIN_EDITS = 20
const MIN_MS = 60 * 60000
const TOAST_MS = 12000

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: the stretch since the last commit. `since` is the first edit of the stretch.
const stretch: { edits: number; since: number | undefined; isTold: boolean } = { edits: 0, since: undefined, isTold: false }

const COMMIT = /\bgit\s+(?:-c\s+\S+\s+|-\S+\s+)*commit\b/

const clear = (): void => {
  stretch.edits = 0
  stretch.since = undefined
  stretch.isTold = false
}

const edited = async ($: EngineInterface, agentId: unknown): Promise<void> => {
  if (agentId === undefined) {
    stretch.edits += 1
    stretch.since ??= await $.clock.now()
  }
}

const watch = async <R extends { deny?: string; isError?: boolean }>(command: string, run: () => Promise<R>): Promise<R> => {
  const ran = await run()

  if (ran.deny === undefined && ran.isError !== true && COMMIT.test(command)) {
    clear()
  }

  return ran
}

const minutes = (ms: number): string => {
  const total = Math.floor(ms / 60000)

  return total >= 60 ? `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m` : `${total}m`
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    clear()

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    await edited($, (e as { agentId?: string }).agentId)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    await edited($, (e as { agentId?: string }).agentId)

    return ran
  })

  on('tool.call', { tool: 'Bash' }, (_$, e, next) => watch(e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, (_$, e, next) => watch(e.command, () => next(e)))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !stretch.isTold && stretch.since !== undefined && stretch.edits >= MIN_EDITS) {
      const spent = (await $.clock.now()) - stretch.since

      if (spent >= MIN_MS) {
        stretch.isTold = true
        $.ui.toast((await strings($)).edits(stretch.edits, minutes(spent)), { timeoutMs: TOAST_MS })
      }
    }

    return next(e)
  })
}
