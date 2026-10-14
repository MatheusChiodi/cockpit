import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

const KEY = 'mode'

const SHAPES = {
  bullets: 'Answer as short bullet points, one idea per bullet, no paragraphs.',
  steps: 'Answer as a numbered list of steps in the order to perform them, one action per step.',
  table: 'Answer as a Markdown table when comparing or listing items with attributes; one line of text before it at most.',
  prose: 'Answer in plain prose paragraphs, no bullet lists, no headings.',
} as const

type Shape = keyof typeof SHAPES

const isShape = (value: unknown): value is Shape => typeof value === 'string' && value in SHAPES

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'format', description: s.command, argumentHint: s.hint })

    const held = await $.store.get(KEY)

    if (isShape(held)) {
      $.ui.status(s.status(held))
    }

    return next(e)
  })

  on('command.run', { command: 'format' }, async ($, e) => {
    const s = await strings($)
    const wanted = e.args.trim().toLowerCase()
    const held = await $.store.get(KEY)

    if (wanted === '') {
      return { text: isShape(held) ? s.current(held) : s.none }
    }

    if (wanted === 'off') {
      await $.store.delete(KEY)
      $.ui.status(undefined)

      return { text: s.cleared }
    }

    if (!isShape(wanted)) {
      return { text: s.unknown(wanted) }
    }

    await $.store.set(KEY, wanted)
    $.ui.status(s.status(wanted))

    return { text: s.set(wanted) }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const held = await $.store.get(KEY)

    return isShape(held)
      ? { sections: [...composed.sections, { id: 'answer-format:shape', text: `# Answer format\n${SHAPES[held]}`, scope: 'session' }] }
      : composed
  })
}
