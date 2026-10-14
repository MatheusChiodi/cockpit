const en = {
  lastCommand: "Copy Claude's last reply to the clipboard",
  codeCommand: 'Copy the last code block of the last reply',
  answer: 'Reply',
  code: 'Code',
  copied: (what: string, length: number) => `${what} copied (${length} characters).`,
  noClipboard: 'The clipboard is not reachable on this surface.',
  noAnswer: 'There is no reply to copy yet.',
  noBlock: 'The last reply has no code block.',
}

type Strings = typeof en

const pt: Strings = {
  lastCommand: 'Copia a última resposta do Claude para a área de transferência',
  codeCommand: 'Copia o último bloco de código da última resposta',
  answer: 'Resposta',
  code: 'Código',
  copied: (what, length) => `${what} copiado (${length} caracteres).`,
  noClipboard: 'Não foi possível acessar a área de transferência nesta superfície.',
  noAnswer: 'Ainda não há resposta para copiar.',
  noBlock: 'A última resposta não tem bloco de código.',
}

const es: Strings = {
  lastCommand: 'Copia la última respuesta de Claude al portapapeles',
  codeCommand: 'Copia el último bloque de código de la última respuesta',
  answer: 'Respuesta',
  code: 'Código',
  copied: (what, length) => `${what} copiado (${length} caracteres).`,
  noClipboard: 'No se pudo acceder al portapapeles en esta superficie.',
  noAnswer: 'Todavía no hay respuesta para copiar.',
  noBlock: 'La última respuesta no tiene bloque de código.',
}

export const STRINGS = { en, pt, es }
