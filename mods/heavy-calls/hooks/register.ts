import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Heavy = { tool: string; target: string; chars: number }

const KEPT = 20
const SHOWN = 5

// `text` is the result as the model reads it; a hook's own answer has none.
const sizeOf = (ran: { text?: string; result?: unknown }): number =>
  ran.text?.length ?? JSON.stringify(ran.result ?? '').length

const targetOf = (e: object): string => {
  const args = e as Record<string, unknown>
  const value = args.command ?? args.file_path ?? args.pattern ?? args.url ?? args.query ?? ''

  return String(value).replace(/\s+/g, ' ').slice(0, 56)
}

export const register: Register = on => {
  const heavy: Heavy[] = []
  let calls = 0
  let total = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'heavy', description: (await strings($)).command })

    return next(e)
  })

  on('tool.call', async (_$, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      const chars = sizeOf(ran)
      calls += 1
      total += chars
      heavy.push({ tool: String(e.tool), target: targetOf(e), chars })
      heavy.sort((a, b) => b.chars - a.chars)
      heavy.length = Math.min(heavy.length, KEPT)
    }

    return ran
  })

  on('command.run', { command: 'heavy' }, async $ => {
    const s = await strings($)
    const tokens = (chars: number) => Math.round(chars / 4)

    if (calls === 0) {
      return { text: s.none }
    }

    const rows = heavy.slice(0, SHOWN).map((entry, at) => {
      const size = tokens(entry.chars).toLocaleString(s.locale).padStart(8)

      return `  ${at + 1}. ${size} ${s.tok}  ${entry.tool.padEnd(5)}  ${entry.target}`.trimEnd()
    })

    return { text: [s.title(tokens(total).toLocaleString(s.locale), calls), ...rows].join('\n') }
  })
}
