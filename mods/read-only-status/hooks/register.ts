import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('read-only-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// A few files read without editing is normal; the line appears when looking starts to dominate.
const MIN_FILES = 5

const files: { read: Set<string>; edited: Set<string>; shown: string | undefined } = {
  read: new Set(),
  edited: new Set(),
  shown: undefined,
}

const slashed = (path: string): string => path.replace(/\\/g, '/')

const draw = async ($: EngineInterface): Promise<void> => {
  const only = [...files.read].filter(path => !files.edited.has(path)).length
  const total = new Set([...files.read, ...files.edited]).size
  const s = await strings($)
  const text = only >= MIN_FILES ? `${s.label} ${s.files(only, total)}` : undefined

  if (text !== files.shown) {
    files.shown = text
    await show($, text)
  }
}

const noted = async ($: EngineInterface, path: string, isEdit: boolean): Promise<void> => {
  const known = isEdit ? files.edited : files.read
  const key = slashed(path)

  if (!known.has(key)) {
    known.add(key)
    await draw($)
  }
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    files.shown = undefined
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    files.read.clear()
    files.edited.clear()
    await draw($)

    return next(e)
  })

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && ran.deny === undefined && ran.isError !== true) {
      await noted($, e.file_path, false)
    }

    return ran
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await noted($, e.file_path, true)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await noted($, e.file_path, true)
    }

    return ran
  })
}
