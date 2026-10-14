const en = {
  label: 'compact',
  almostFull: 'context almost full',
  button: 'Compact now',
  failed: "Couldn't compact right now (turn in progress?).",
  done: 'Conversation compacted.',
}

type Strings = typeof en

const pt: Strings = {
  label: 'compactar',
  almostFull: 'contexto quase cheio',
  button: 'Compactar agora',
  failed: 'Não deu para compactar agora (turno em andamento?).',
  done: 'Conversa compactada.',
}

const es: Strings = {
  label: 'compactar',
  almostFull: 'contexto casi lleno',
  button: 'Compactar ahora',
  failed: 'No se pudo compactar ahora (¿turno en curso?).',
  done: 'Conversación compactada.',
}

export const STRINGS = { en, pt, es }
