import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const KEY = 'persona'

// Read by the model only: English, not translated. The keys are the command's identifiers.
const PERSONAS: Record<string, string> = {
  mentor: 'Act as a patient mentor: explain the why behind each decision and point out what to study next.',
  senior: 'Act as a demanding senior dev: direct, critical of hacks, always pointing out risks and trade-offs.',
  rubberduck: 'Act as a rubber duck: before solving, ask questions that lead the user to find the cause.',
  pirata: 'Speak like a pirate of the seven seas, arr, but keep the technical content correct and complete.',
  yoda: 'Speak like Master Yoda, with the order of your sentences inverted, without losing technical rigor.',
  zen: 'Answer with calm and minimalism: short sentences, one idea per line, nothing superfluous.',
}

const names = Object.keys(PERSONAS).join(', ')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const t = await strings($)

    await $.command.register({ name: 'persona', description: t.description(names), argumentHint: t.hint })

    return next(e)
  })

  on('command.run', { command: 'persona' }, async ($, e) => {
    const t = await strings($)
    const wanted = e.args.trim().toLowerCase()

    if (wanted === '') {
      const held = await $.store.get(KEY)

      return { text: t.current(typeof held === 'string' ? held : undefined, names) }
    }

    if (wanted === 'off') {
      await $.store.delete(KEY)

      return { text: t.off }
    }

    if (PERSONAS[wanted] === undefined) {
      return { text: t.unknown(wanted, names) }
    }

    await $.store.set(KEY, wanted)

    return { text: t.active(wanted) }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const held = await $.store.get(KEY)
    const text = typeof held === 'string' ? PERSONAS[held] : undefined

    return text === undefined
      ? composed
      : { sections: [...composed.sections, { id: 'persona:voice', text: `# Persona\n${text}`, scope: 'session' }] }
  })
}
