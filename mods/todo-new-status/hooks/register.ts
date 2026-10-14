import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('todo-new-status')

const added = atom({ plugin: 'todo-new-status', key: 'added' } as const, 0)
const line = atom({ plugin: 'todo-new-status', key: 'line' } as const, '')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Sends the text to the status line only when it changed.
const show = async ($: EngineInterface): Promise<void> => {
  const count = await read($, added)
  const s = await strings($)
  const next = (await isOff($)) || count === 0 ? '' : `${s.label} ${s.added(count)}`

  if ((await read($, line)) === next) {
    return
  }

  await update($, line, () => next)
  $.ui.status(next === '' ? undefined : next)
}

const MARKER = /\b(?:TODO|FIXME|HACK|XXX)\b/g

// Notes and docs list TODOs on purpose: only code counts.
const PROSE = /\.(md|mdx|txt|rst)$/i

const markers = (text: string | undefined): number => (text ?? '').match(MARKER)?.length ?? 0

const record = async ($: EngineInterface, delta: number): Promise<void> => {
  if (delta > 0) {
    await update($, added, held => held + delta)
    await show($)
  }
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($)

    return set
  })

  on('session.start', async ($, e, next) => {
    await update($, added, () => 0)
    await show($)

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true && !PROSE.test(e.file_path)) {
      await record($, markers(e.new_string) - markers(e.old_string))
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const isCode = !PROSE.test(e.file_path)
    const before = isCode ? ((await $.fs.read(e.file_path).catch(() => '')) ?? '') : ''
    const ran = await next(e)

    if (isCode && ran.deny === undefined && ran.isError !== true) {
      await record($, markers(e.content) - markers(before))
    }

    return ran
  })
}
