import type { EngineInterface, Register } from 'claude-code'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('project-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const MANAGERS: readonly (readonly [string, string])[] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
]

const describe = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)
  let label = root.split(/[\\/]/).filter(part => part !== '').at(-1) ?? root

  if (manifest !== undefined) {
    try {
      const { name, version } = JSON.parse(manifest) as { name?: string; version?: string }
      label = `${name ?? label}${version === undefined ? '' : `@${version}`}`
    } catch {
      // Invalid package.json: the folder name stays.
    }
  }

  const node = await $.process.run(['node', '--version'], { timeoutMs: 5000 }).catch(() => undefined)
  const parts = [label]

  if (manifest !== undefined && node?.exitCode === 0) {
    parts.push(`node ${node.stdout.trim().replace(/^v/, '')}`)
  }

  for (const [lockfile, manager] of MANAGERS) {
    if (await $.fs.exists(`${root}/${lockfile}`)) {
      parts.push(manager)
      break
    }
  }

  void show($, parts.join(' · '))
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await describe($)

    return next(e)
  })
}
