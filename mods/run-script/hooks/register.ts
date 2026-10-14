import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TAIL = 30

// The lockfile that exists names the package manager; npm when none does.
const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
] as const

const manager = async ($: EngineInterface, root: string): Promise<string> => {
  for (const [file, name] of LOCKFILES) {
    if (await $.fs.exists(`${root}/${file}`)) {
      return name
    }
  }

  return 'npm'
}

const scriptsOf = async ($: EngineInterface, root: string): Promise<Record<string, string> | undefined> => {
  const text = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (typeof text !== 'string') {
    return undefined
  }

  try {
    const scripts = (JSON.parse(text) as { scripts?: Record<string, string> }).scripts

    return scripts !== null && typeof scripts === 'object' ? scripts : {}
  } catch {
    return undefined
  }
}

const runScript = async ($: EngineInterface, name: string): Promise<{ text: string }> => {
  const s = await strings($)
  const root = await $.session.root()
  const scripts = await scriptsOf($, root)

  if (scripts === undefined) {
    return { text: s.noPackage }
  }

  const known = Object.keys(scripts)

  if (name === '') {
    return { text: known.length === 0 ? s.noScripts : known.join('\n') }
  }

  // Only names that package.json declares reach the process: nothing typed is passed on as an option.
  if (!Object.prototype.hasOwnProperty.call(scripts, name)) {
    return { text: s.unknown(name, known.join(', ')) }
  }

  const pm = await manager($, root)
  const argv = [pm, 'run', name]
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const ran = await $.process
    .run(isWindows ? ['cmd', '/c', ...argv] : argv, { timeoutMs: 300000 })
    .catch(() => undefined)

  if (ran === undefined) {
    return { text: s.failed }
  }

  const tail = `${ran.stdout}\n${ran.stderr}`
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line !== '')
    .slice(-TAIL)

  return { text: [s.header(argv.join(' ')), ...(tail.length === 0 ? [s.noOutput] : tail), s.exit(ran.exitCode)].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'run', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'run' }, ($, e) => runScript($, e.args.trim()))
}
