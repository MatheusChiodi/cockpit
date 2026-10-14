import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('build-size-status')

const first = atom({ plugin: 'build-size-status', key: 'first' } as const, -1)
const line = atom({ plugin: 'build-size-status', key: 'line' } as const, '')

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

// Where the common builds write, in the order they are tried.
const OUTPUTS = ['dist', 'build', 'out', '.output', '.next'] as const

// A walk that never takes long: past this many entries the size is a floor.
const MAX_ENTRIES = 4000
const SKIPPED = new Set(['node_modules', 'cache'])

const measure = async ($: EngineInterface, dir: string): Promise<{ bytes: number; isPartial: boolean }> => {
  const pending = [dir]
  let bytes = 0
  let seen = 0

  for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
    for (const entry of await $.fs.list(path).catch(() => [])) {
      seen += 1

      if (entry.kind === 'dir' && !SKIPPED.has(entry.name)) {
        pending.push(`${path}/${entry.name}`)
      } else if (entry.kind === 'file') {
        bytes += entry.size
      }

      if (seen >= MAX_ENTRIES) {
        return { bytes, isPartial: true }
      }
    }
  }

  return { bytes, isPartial: false }
}

const KB = 1024
const MB = KB * KB

const sized = (bytes: number, locale: string): string =>
  bytes >= MB
    ? `${(bytes / MB).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`
    : `${Math.round(bytes / KB).toLocaleString(locale)} KB`

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  let output: string | undefined

  for (const name of OUTPUTS) {
    if (output === undefined && (await $.fs.exists(`${root}/${name}`))) {
      output = name
    }
  }

  if (output === undefined) {
    return show($, undefined)
  }

  const { bytes, isPartial } = await measure($, `${root}/${output}`)

  if (bytes === 0) {
    return show($, undefined)
  }

  if ((await read($, first)) < 0) {
    await update($, first, () => bytes)
  }

  const delta = bytes - (await read($, first))
  const { locale } = await strings($)
  const growth = Math.abs(delta) >= KB ? ` · ${delta > 0 ? '+' : '−'}${sized(Math.abs(delta), locale)}` : ''

  return show($, `${output} ${isPartial ? '>' : ''}${sized(bytes, locale)}${growth}`)
}

const BUILDS = /\b(build|vite|webpack|tsc|rollup|esbuild|next|parcel|tsup|expo\s+export)\b/

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await refresh($)

    return set
  })

  on('session.start', async ($, e, next) => {
    await update($, first, () => -1)
    await refresh($)
    $.clock.every(300000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (BUILDS.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (BUILDS.test(e.command)) {
      void refresh($)
    }

    return ran
  })
}
