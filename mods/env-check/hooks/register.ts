import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const KEY = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=/

// Only the names survive: each line is cut at its "=" and the rest is never kept, shown or logged.
const keysOf = (text: string): Set<string> => {
  const keys = new Set<string>()

  for (const line of text.split('\n')) {
    const name = KEY.exec(line)?.[1]

    if (name !== undefined) {
      keys.add(name)
    }
  }

  return keys
}

const load = async ($: EngineInterface, file: string): Promise<Set<string> | undefined> => {
  const path = `${await $.session.root()}/${file}`

  if (!(await $.fs.exists(path))) {
    return undefined
  }

  const text = await $.fs.read(path).catch(() => undefined)

  return typeof text === 'string' ? keysOf(text) : undefined
}

const compare = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const example = await load($, '.env.example')

  if (example === undefined) {
    return { text: s.noExample }
  }

  const env = await load($, '.env')

  if (env === undefined) {
    return { text: s.noEnv }
  }

  const missing = [...example].filter(key => !env.has(key)).sort()
  const extra = [...env].filter(key => !example.has(key)).sort()

  if (missing.length === 0 && extra.length === 0) {
    return { text: s.match(example.size) }
  }

  const section = (title: string, keys: string[]) => (keys.length === 0 ? [] : [title, ...keys.map(key => `  ${key}`)])

  return { text: [...section(s.missing, missing), ...section(s.extra, extra)].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'envcheck', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'envcheck' }, $ => compare($))
}
