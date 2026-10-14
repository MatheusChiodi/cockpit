import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('db-port-status')

const line = atom({ plugin: 'db-port-status', key: 'line' } as const, '')

// Sends the text to the status line only when it changed.
const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  const next = (await isOff($)) ? '' : (text ?? '')

  if ((await read($, line)) === next) {
    return
  }

  await update($, line, () => next)
  $.ui.status(next === '' ? undefined : next)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.example'] as const

// scheme -> the name shown and the port the server uses when the URL has none.
const SERVICES: Readonly<Record<string, readonly [string, number]>> = {
  postgres: ['postgres', 5432],
  postgresql: ['postgres', 5432],
  mysql: ['mysql', 3306],
  mariadb: ['mysql', 3306],
  mongodb: ['mongodb', 27017],
  redis: ['redis', 6379],
  amqp: ['rabbitmq', 5672],
}

// Only URLs that point at this machine; the user and password are matched but never kept.
const LOCAL_URL = /\b(postgres(?:ql)?|mysql|mariadb|mongodb|redis|amqp):\/\/(?:[^@\s/]*@)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::(\d+))?/g

type Target = { name: string; port: number }

const targetsIn = (text: string): Target[] => {
  const found = new Map<number, Target>()

  for (const match of text.matchAll(LOCAL_URL)) {
    const [name, defaultPort] = SERVICES[match[1] ?? ''] ?? []

    if (name !== undefined && defaultPort !== undefined) {
      const port = Number(match[2] ?? defaultPort)
      found.set(port, { name, port })
    }
  }

  return [...found.values()]
}

// The ports with a listener, from netstat or, where it is missing, ss. Undefined when neither runs.
const listening = async ($: EngineInterface): Promise<string[] | undefined> => {
  for (const argv of [['netstat', '-an'], ['ss', '-ltn']]) {
    const ran = await $.process.run(argv, { timeoutMs: 5000 }).catch(() => undefined)

    if (ran !== undefined && ran.exitCode === 0) {
      return ran.stdout.split('\n').filter(entry => /LISTEN/.test(entry))
    }
  }

  return undefined
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const targets = new Map<number, Target>()

  for (const file of ENV_FILES) {
    for (const target of targetsIn((await $.fs.read(`${root}/${file}`).catch(() => '')) ?? '')) {
      targets.set(target.port, target)
    }
  }

  const open = targets.size === 0 ? undefined : await listening($)

  if (open === undefined) {
    return show($, undefined)
  }

  const down = [...targets.values()].filter(({ port }) => !open.some(entry => new RegExp(`[:.]${port}\\s`).test(entry)))

  if (down.length === 0) {
    return show($, undefined)
  }

  const s = await strings($)

  return show($, `${s.label} ✗ ${down.map(({ name, port }) => `${name}:${port}`).join(' ')} ${s.down}`)
}

const SERVICE_COMMAND = /\b(docker|compose|pg_ctl|brew\s+services|systemctl|service|redis|postgres|mysql|mongo)/i

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await refresh($)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(30000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (SERVICE_COMMAND.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (SERVICE_COMMAND.test(e.command)) {
      void refresh($)
    }

    return ran
  })
}
