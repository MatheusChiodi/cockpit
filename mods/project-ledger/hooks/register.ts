import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Ledger = Record<string, number>

// One record per project: the cost of each of its sessions, so summing gives the project's spend.
const keyOf = async ($: EngineInterface): Promise<string> => `project:${await $.session.root()}`

const load = async ($: EngineInterface): Promise<Ledger> => {
  const held = await $.store.get(await keyOf($))

  return typeof held === 'object' && held !== null ? { ...(held as Ledger) } : {}
}

const sum = (ledger: Ledger): number => Object.values(ledger).reduce((total, value) => total + value, 0)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'projspend', description: (await strings($)).command })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.cost !== undefined) {
      const ledger = await load($)
      ledger[await $.session.id()] = e.cost.usd
      await $.store.set(await keyOf($), ledger)
    }

    return next(e)
  })

  on('command.run', { command: 'projspend' }, async $ => {
    const s = await strings($)
    const ledger = await load($)
    const total = sum(ledger)

    if (total <= 0) {
      return { text: s.none }
    }

    const here = ledger[await $.session.id()] ?? 0

    return {
      text: [s.head(total.toFixed(2), Object.keys(ledger).length), s.here(here.toFixed(2)), s.before((total - here).toFixed(2))].join(
        '\n',
      ),
    }
  })
}
