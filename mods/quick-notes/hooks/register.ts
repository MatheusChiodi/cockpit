import type { EngineInterface, Register } from 'claude-code'

type Note = { text: string; at: number }

// Uma lista por projeto: a chave do store é a raiz da sessão.
const load = async ($: EngineInterface): Promise<{ key: string; notes: Note[] }> => {
  const key = `notes:${await $.session.root()}`
  const held = await $.store.get(key)

  return { key, notes: Array.isArray(held) ? (held as Note[]) : [] }
}

const listing = (notes: readonly Note[]): string =>
  notes.length === 0
    ? 'Nenhuma nota neste projeto. Use /note <texto>.'
    : notes
        .map((note, index) => `${index + 1}. ${note.text}  (${new Date(note.at).toLocaleDateString('pt-BR')})`)
        .join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'note',
      description: 'Salva uma nota rápida neste projeto (persistente entre sessões)',
      argumentHint: '<texto>',
    })
    await $.command.register({
      name: 'notes',
      description: 'Lista as notas do projeto; /notes rm <n> remove; /notes clear apaga todas',
      argumentHint: '[rm <n> | clear]',
    })

    return next(e)
  })

  on('command.run', { command: 'note' }, async ($, e) => {
    const text = e.args.trim()

    if (text === '') {
      return { text: 'Uso: /note <texto>' }
    }

    const { key, notes } = await load($)
    await $.store.set(key, [...notes, { text, at: await $.clock.now() }])

    return { text: `Nota ${notes.length + 1} salva.` }
  })

  on('command.run', { command: 'notes' }, async ($, e) => {
    const { key, notes } = await load($)
    const [action, value] = e.args.trim().split(/\s+/)

    if (action === 'clear') {
      await $.store.delete(key)

      return { text: `${notes.length} nota(s) apagada(s).` }
    }

    if (action === 'rm') {
      const index = Number(value) - 1

      if (!Number.isInteger(index) || notes[index] === undefined) {
        return { text: `Nota inexistente: ${value ?? '(vazio)'}` }
      }

      await $.store.set(key, notes.filter((_, at) => at !== index))

      return { text: `Nota ${index + 1} removida.` }
    }

    return { text: listing(notes) }
  })
}
