import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Note = { text: string; at: number }

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// One list per project: the store key is the session's root.
const load = async ($: EngineInterface): Promise<{ key: string; notes: Note[] }> => {
  const key = `notes:${await $.session.root()}`
  const held = await $.store.get(key)

  return { key, notes: Array.isArray(held) ? (held as Note[]) : [] }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'note', description: s.noteCommand, argumentHint: s.noteHint })
    await $.command.register({ name: 'notes', description: s.notesCommand, argumentHint: s.notesHint })

    return next(e)
  })

  on('command.run', { command: 'note' }, async ($, e) => {
    const s = await strings($)
    const text = e.args.trim()

    if (text === '') {
      return { text: s.usage }
    }

    const { key, notes } = await load($)
    await $.store.set(key, [...notes, { text, at: await $.clock.now() }])

    return { text: s.saved(notes.length + 1) }
  })

  on('command.run', { command: 'notes' }, async ($, e) => {
    const s = await strings($)
    const { key, notes } = await load($)
    const [action, value] = e.args.trim().split(/\s+/)

    if (action === 'clear') {
      await $.store.delete(key)

      return { text: s.cleared(notes.length) }
    }

    if (action === 'rm') {
      const index = Number(value) - 1

      if (!Number.isInteger(index) || notes[index] === undefined) {
        return { text: s.missing(value ?? '') }
      }

      await $.store.set(key, notes.filter((_, at) => at !== index))

      return { text: s.removed(index + 1) }
    }

    return {
      text:
        notes.length === 0
          ? s.empty
          : notes
              .map((note, index) => `${index + 1}. ${note.text}  (${new Date(note.at).toLocaleDateString(s.locale)})`)
              .join('\n'),
    }
  })
}
