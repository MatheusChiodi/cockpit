import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('turn-tokens-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// done: tokens of the finished responses; live: the estimate for the one still streaming.
const turn: { done: number; live: number; shown: string | undefined } = { done: 0, live: 0, shown: undefined }

const CHARS_PER_TOKEN = 4

const compact = (tokens: number): string =>
  tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(Math.round(tokens / 10) * 10)

// Redraws only when the rounded text changes, so a stream of small chunks costs one write per step of 10 or 100 tokens.
const draw = async ($: EngineInterface): Promise<void> => {
  const total = turn.done + turn.live
  const s = await strings($)
  const text = total === 0 ? undefined : `${s.label} ${turn.live > 0 ? '~' : ''}${compact(total)} ${s.tokens}`

  if (text !== turn.shown) {
    turn.shown = text
    await show($, text)
  }
}

export const register: Register = on => {
  // A status line entry is not redrawn by a state change: clear it when the hub's switch moves.
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    turn.shown = undefined
    await show($, undefined)

    return set
  })

  on('turn.start', async ($, e, next) => {
    turn.done = 0
    turn.live = 0
    await draw($)

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) {
      return yield* next(e)
    }

    let chars = 0

    for await (const chunk of next(e)) {
      if (chunk.kind === 'text' || chunk.kind === 'thinking' || chunk.kind === 'input') {
        chars += (chunk.kind === 'input' ? chunk.json : chunk.text).length
        turn.live = Math.round(chars / CHARS_PER_TOKEN)
        await draw($)
      } else if (chunk.kind === 'stop') {
        // The count the API reports replaces the estimate.
        turn.done += chunk.usage?.output_tokens ?? turn.live
        turn.live = 0
        await draw($)
      }

      yield chunk
    }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      turn.done = 0
      turn.live = 0
      await draw($)
    }

    return next(e)
  })
}
