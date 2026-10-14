import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Turn = { n: number; text: string; usd: number; tools: Map<string, number> }

// Module state: a reload drops it along with the old environment.
const session: { total: number; turns: Turn[] } = { total: 0, turns: [] }

const current = (): Turn | undefined => session.turns.at(-1)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'priciest', description: (await strings($)).command })

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    session.turns.push({ n: session.turns.length + 1, text: e.text.replace(/\s+/g, ' ').trim().slice(0, 80), usd: 0, tools: new Map() })

    return next(e)
  })

  on('tool.call', async (_$, e, next) => {
    const turn = current()

    if (turn !== undefined) {
      turn.tools.set(String(e.tool), (turn.tools.get(String(e.tool)) ?? 0) + 1)
    }

    return next(e)
  })

  // The cost of a turn is the growth of the session total while it ran.
  on('session.measure', (_$, e, next) => {
    if (e.cost !== undefined) {
      const turn = current()

      if (turn !== undefined) {
        turn.usd += Math.max(0, e.cost.usd - session.total)
      }

      session.total = e.cost.usd
    }

    return next(e)
  })

  on('command.run', { command: 'priciest' }, async $ => {
    const s = await strings($)
    const top = session.turns.reduce<Turn | undefined>((best, turn) => (best === undefined || turn.usd > best.usd ? turn : best), undefined)

    if (top === undefined || top.usd <= 0) {
      return { text: s.none }
    }

    const tools = [...top.tools].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}×${count}`)

    return {
      text: [
        s.head(top.n, top.usd.toFixed(2), Math.round((top.usd / session.total) * 100)),
        top.text === '' ? s.noPrompt : s.asked(top.text),
        tools.length === 0 ? s.noTools : s.tools(tools.join('  ')),
      ].join('\n'),
    }
  })
}
