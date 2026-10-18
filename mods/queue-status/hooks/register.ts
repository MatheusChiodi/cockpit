import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('queue-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// busy: a main-loop turn is running; waiting: prompts typed meanwhile and not yet delivered.
const queue = { busy: false, waiting: 0 }

const draw = async ($: EngineInterface): Promise<void> => {
  const s = await strings($)

  await show($, queue.waiting > 0 ? `${s.label} ${s.waiting(queue.waiting)}` : undefined)
}

const leave = async ($: EngineInterface): Promise<void> => {
  if (queue.waiting > 0) {
    queue.waiting -= 1
    await draw($)
  }
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    queue.busy = false
    queue.waiting = 0

    return next(e)
  })

  // A prompt typed while a turn runs waits behind it. A slash command is not a prompt for the model.
  on('prompt.submit', async ($, e, next) => {
    const isQueued = queue.busy && !e.text.trimStart().startsWith('/')
    const entered = await next(e)

    if (isQueued && !('drop' in entered)) {
      queue.waiting += 1
      await draw($)
    }

    return entered
  })

  // The waiting prompt starts its own turn...
  on('turn.start', async ($, e, next) => {
    queue.busy = true
    await leave($)

    return next(e)
  })

  // ...or reaches the model inside the running turn, as a queued command.
  on('session.append', { door: 'attachment' }, async ($, e, next) => {
    if (e.message.name === 'queued_command' && e.agentId === undefined) {
      await leave($)
    }

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      queue.busy = false
    }

    return next(e)
  })
}
