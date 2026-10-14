import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const PORTS = [3000, 3001, 4200, 5000, 5173, 8000, 8080, 8081, 19006] as const

// Any HTTP answer counts, whatever its status; a refused connection rejects.
const probe = async ($: EngineInterface, port: number): Promise<number | undefined> =>
  (await $.http.fetch(`http://localhost:${port}/`).catch(() => undefined))?.status

const scan = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const answers = await Promise.all(PORTS.map(async port => ({ port, status: await probe($, port) })))
  const open = answers.filter(({ status }) => status !== undefined)

  if (open.length === 0) {
    return { text: s.none }
  }

  return {
    text: [...open.map(({ port, status }) => `● ${String(port).padEnd(6)}${status}`), s.summary(open.length, PORTS.length)].join('\n'),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'ports', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'ports' }, $ => scan($))
}
