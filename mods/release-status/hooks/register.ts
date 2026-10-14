import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('release-status')

const line = atom({ plugin: 'release-status', key: 'line' } as const, '')

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

const git = async ($: EngineInterface, args: readonly string[]): Promise<string | undefined> => {
  const ran = await $.process.run(['git', '--no-pager', ...args], { timeoutMs: 5000 }).catch(() => undefined)

  return ran === undefined || ran.exitCode !== 0 ? undefined : ran.stdout.trim()
}

// The version the project declares: package.json, or the first version of Cargo.toml.
const versionOf = async ($: EngineInterface, root: string): Promise<string | undefined> => {
  const npm = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (npm !== undefined) {
    try {
      return (JSON.parse(npm) as { version?: string }).version
    } catch {
      return undefined
    }
  }

  const cargo = await $.fs.read(`${root}/Cargo.toml`).catch(() => undefined)

  return /^version\s*=\s*"([^"]+)"/m.exec(cargo ?? '')?.[1]
}

const bare = (tag: string): string => tag.replace(/^[^\d]*/, '')

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const version = await versionOf($, root)
  const tag = version === undefined ? undefined : await git($, ['describe', '--tags', '--abbrev=0'])

  if (version === undefined || tag === undefined || tag === '') {
    return show($, undefined)
  }

  const count = Number(await git($, ['rev-list', '--count', `${tag}..HEAD`])) || 0
  const same = bare(tag) === version

  if (same && count === 0) {
    return show($, undefined)
  }

  const s = await strings($)
  const detail = count === 0 ? s.untagged : `${s.since(count, tag)}${same ? ` · ${s.notBumped}` : ''}`

  return show($, `${s.label} ${version} · ${detail}`)
}

const CHANGES = /\bgit\b|\b(npm|pnpm|yarn)\s+version\b|\bcargo\s+release\b/

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
