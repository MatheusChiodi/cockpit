import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const run = ($: EngineInterface, argv: readonly string[]) =>
  $.process.run(argv, { timeoutMs: 15000 }).catch(() => undefined)

// The ids of the processes listening on the port, or undefined when the lookup itself failed.
const holders = async ($: EngineInterface, port: number, isWindows: boolean): Promise<number[] | undefined> => {
  const ran = isWindows ? await run($, ['netstat', '-ano', '-p', 'TCP']) : await run($, ['lsof', '-ti', `tcp:${port}`, '-sTCP:LISTEN'])

  // lsof exits 1 with no output when nothing listens.
  if (ran === undefined || (ran.exitCode !== 0 && !(ran.stdout === '' && !isWindows))) {
    return undefined
  }

  const ids = isWindows
    ? ran.stdout
        .split('\n')
        .map(line => line.trim().split(/\s+/))
        .filter(cols => cols[3] === 'LISTENING' && cols[1]?.endsWith(`:${port}`))
        .map(cols => Number(cols[4]))
    : ran.stdout.split('\n').map(line => Number(line.trim()))

  return [...new Set(ids.filter(id => Number.isInteger(id) && id > 0))]
}

const nameOf = async ($: EngineInterface, pid: number, isWindows: boolean): Promise<string | undefined> => {
  const ran = isWindows
    ? await run($, ['tasklist', '/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'])
    : await run($, ['ps', '-p', String(pid), '-o', 'comm='])
  const first = ran?.stdout.trim().split('\n')[0] ?? ''

  return (isWindows ? /^"([^"]+)"/.exec(first)?.[1] : first) || undefined
}

const killPort = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const port = Number(typed)

  if (!/^\d{1,5}$/.test(typed) || port < 1 || port > 65535) {
    return { text: s.usage }
  }

  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const pids = await holders($, port, isWindows)

  if (pids === undefined) {
    return { text: s.lookupFailed }
  }

  if (pids.length === 0) {
    return { text: s.free(port) }
  }

  const who = (
    await Promise.all(pids.map(async pid => `${(await nameOf($, pid, isWindows)) ?? s.unknown} (pid ${pid})`))
  ).join(', ')
  const answer = await $.ui.ask(s.confirm(port, who), [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const ended = await Promise.all(
    pids.map(pid => run($, isWindows ? ['taskkill', '/PID', String(pid), '/F'] : ['kill', String(pid)])),
  )

  return { text: ended.every(ran => ran?.exitCode === 0) ? s.ended(who) : s.failed(who) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'killport', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'killport' }, ($, e) => killPort($, e.args.trim()))
}
