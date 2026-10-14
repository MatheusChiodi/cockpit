const en = {
  locale: 'en-US',
  noteCommand: 'Save a quick note in this project (kept between sessions)',
  noteHint: '<text>',
  notesCommand: 'List the project notes; /notes rm <n> removes one; /notes clear removes all',
  notesHint: '[rm <n> | clear]',
  usage: 'Usage: /note <text>',
  saved: (count: number) => `Note ${count} saved.`,
  empty: 'No notes in this project yet. Add one with /note <text>.',
  cleared: (count: number) => `${count} note(s) removed.`,
  missing: (value: string) => `No such note: ${value}`,
  removed: (index: number) => `Note ${index} removed.`,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  noteCommand: 'Salva uma nota rápida neste projeto (persistente entre sessões)',
  noteHint: '<texto>',
  notesCommand: 'Lista as notas do projeto; /notes rm <n> remove uma; /notes clear apaga todas',
  notesHint: '[rm <n> | clear]',
  usage: 'Uso: /note <texto>',
  saved: count => `Nota ${count} salva.`,
  empty: 'Nenhuma nota neste projeto ainda. Adicione com /note <texto>.',
  cleared: count => `${count} nota(s) apagada(s).`,
  missing: value => `Nota inexistente: ${value}`,
  removed: index => `Nota ${index} removida.`,
}

const es: Strings = {
  locale: 'es-ES',
  noteCommand: 'Guarda una nota rápida en este proyecto (se conserva entre sesiones)',
  noteHint: '<texto>',
  notesCommand: 'Lista las notas del proyecto; /notes rm <n> borra una; /notes clear borra todas',
  notesHint: '[rm <n> | clear]',
  usage: 'Uso: /note <texto>',
  saved: count => `Nota ${count} guardada.`,
  empty: 'Todavía no hay notas en este proyecto. Añade una con /note <texto>.',
  cleared: count => `${count} nota(s) borrada(s).`,
  missing: value => `No existe la nota: ${value}`,
  removed: index => `Nota ${index} borrada.`,
}

export const STRINGS = { en, pt, es }
