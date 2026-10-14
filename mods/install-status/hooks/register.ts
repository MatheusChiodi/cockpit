import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('install-status')

const line = atom({ plugin: 'install-status', key: 'line' } as const, '')

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

// What each package manager leaves in node_modules when an install ends.
const MARKERS = ['.package-lock.json', '.modules.yaml', '.yarn-integrity'] as const
const LOCKS = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'] as const

// A clock skew or a quick follow-up write is not a stale install.
const SLACK_MS = 2000

const mtimeOf = async ($: EngineInterface, path: string): Promise<number | undefined> =>
  ($.fs.stat(path).catch(() => undefined) as Promise<{ mtimeMs: number } | undefined>).then(stat => stat?.mtimeMs)

const hasDependencies = async ($: EngineInterface, root: string): Promise<boolean> => {
  try {
    const manifest = JSON.parse(await $.fs.read(`${root}/package.json`)) as {
      dependencies?: object
      devDependencies?: object
    }

    return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).length > 0
  } catch {
    return false
  }
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()

  // Plug'n'Play has no node_modules by design.
  if (!(await hasDependencies($, root)) || (await $.fs.exists(`${root}/.pnp.cjs`))) {
    return show($, undefined)
  }

  const s = await strings($)
  const dir = await mtimeOf($, `${root}/node_modules`)

  if (dir === undefined) {
    return show($, `${s.label} ✗ ${s.missing}`)
  }

  let installedAt = dir

  for (const marker of MARKERS) {
    installedAt = Math.max(installedAt, (await mtimeOf($, `${root}/node_modules/${marker}`)) ?? 0)
  }

  let wanted = (await mtimeOf($, `${root}/package.json`)) ?? 0

  for (const lock of LOCKS) {
    const at = await mtimeOf($, `${root}/${lock}`)

    if (at !== undefined) {
      wanted = at

      break
    }
  }

  return show($, wanted > installedAt + SLACK_MS ? `${s.label} ✗ ${s.stale}` : undefined)
}

const CHANGES = /\b(npm|pnpm|yarn|bun|git)\b/

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await refresh($)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(120000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (CHANGES.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (CHANGES.test(e.command)) {
      void refresh($)
    }

    return ran
  })
}
