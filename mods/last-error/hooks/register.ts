import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Failure = { command: string; lines: string[] }

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TAIL = 25

// One failure per project, kept for the session: the store key is the session's root.
const keyOf = async ($: EngineInterface): Promise<string> => `lasterr:${await $.session.root()}`

const outputOf = (ran: { result?: unknown; text?: string }): string => {
  const result = ran.result

  if (typeof result === 'string') {
    return result
  }

  if (result !== null && typeof result === 'object') {
    const { stdout, stderr } = result as { stdout?: unknown; stderr?: unknown }

    return [stdout, stderr].filter(part => typeof part === 'string').join('\n')
  }

  return ran.text ?? ''
}

// Watches a shell call without changing it: what `run` resolves to goes back untouched.
const watch = async <R extends { deny?: string; isError?: boolean; result?: unknown; text?: string }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const ran = await run()

  if (ran.deny === undefined && ran.isError === true) {
    const lines = outputOf(ran)
      .split('\n')
      .map(line => line.trimEnd())
      .filter(line => line !== '')
    const failure: Failure = { command, lines: lines.slice(-TAIL) }
    await $.store.set(await keyOf($), failure)
  }

  return ran
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'lasterr', description: s.command })
    await $.store.delete(await keyOf($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('command.run', { command: 'lasterr' }, async $ => {
    const s = await strings($)
    const held = (await $.store.get(await keyOf($))) as Failure | undefined

    if (held === undefined || held === null) {
      return { text: s.none }
    }

    return { text: [`✗ ${held.command}`, ...(held.lines.length === 0 ? [s.noOutput] : held.lines)].join('\n') }
  })
}
