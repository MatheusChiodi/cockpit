import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('license-status')

const line = atom({ plugin: 'license-status', key: 'line' } as const, '')

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

const LICENSE_FILE = /^(licen[sc]e|copying)(\.\w+)?$/i

// A manifest that publishes the project, and the pattern that says it names a license.
const MANIFESTS: readonly (readonly [string, RegExp, RegExp | null])[] = [
  ['pyproject.toml', /^\s*license(-files)?\s*=/m, null],
  ['Cargo.toml', /^\s*license(-file)?\s*=/m, /^\s*publish\s*=\s*false/m],
  ['pom.xml', /<licenses>/, null],
]

const declared = async ($: EngineInterface, root: string): Promise<boolean | undefined> => {
  const npm = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (npm !== undefined) {
    try {
      const manifest = JSON.parse(npm) as { private?: boolean; license?: string; licenses?: unknown }

      // A private package is not published: it needs no license.
      return manifest.private === true || manifest.license !== undefined || manifest.licenses !== undefined
    } catch {
      return undefined
    }
  }

  for (const [file, license, skip] of MANIFESTS) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

    if (text !== undefined) {
      return license.test(text) || (skip?.test(text) ?? false)
    }
  }

  return undefined
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const hasField = await declared($, root)

  if (hasField !== false) {
    return show($, undefined)
  }

  const files = await $.fs.list(root).catch(() => [])

  if (files.some(entry => entry.kind === 'file' && LICENSE_FILE.test(entry.name))) {
    return show($, undefined)
  }

  const s = await strings($)

  return show($, `${s.label} ✗ ${s.none}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await refresh($)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(600000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (/(^|[\\/])(licen[sc]e|copying|package\.json|Cargo\.toml|pyproject\.toml)[^\\/]*$/i.test(e.file_path)) {
      void refresh($)
    }

    return ran
  })
}
