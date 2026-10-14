import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const ACTIVE = new Set(['pending', 'running', 'waiting'])

const cap: { limit: number | undefined } = { limit: undefined }

const runningCount = async ($: EngineInterface): Promise<number> =>
  (await $.agent.list().catch(() => [])).filter(agent => ACTIVE.has(agent.status) && agent.type !== 'teammate').length

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'agentcap', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'agentcap' }, async ($, e) => {
    const s = await strings($)
    const arg = e.args.trim()

    if (arg === '') {
      return { text: cap.limit === undefined ? s.none : s.current(cap.limit) }
    }

    if (arg === 'off') {
      cap.limit = undefined

      return { text: s.off }
    }

    const value = Number(arg)

    if (!Number.isInteger(value) || value < 1) {
      return { text: s.usage }
    }

    cap.limit = value

    return { text: s.set(value) }
  })

  // Does not block: past the cap the person confirms each extra subagent.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if (verdict.decision !== 'allow' || cap.limit === undefined || (e.tool !== 'Agent' && e.tool !== 'Task')) {
      return verdict
    }

    const running = await runningCount($)

    return running >= cap.limit ? { decision: 'ask', reason: (await strings($)).ask(running, cap.limit) } : verdict
  })
}
