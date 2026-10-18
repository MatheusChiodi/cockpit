const en = {
  draft: 'shift+enter newline  ctrl+r history',
  working: 'ctrl+o transcript  ctrl+b background',
  idle: 'esc esc rewind  ctrl+r history',
}

type Strings = typeof en

const pt: Strings = {
  draft: 'shift+enter nova linha  ctrl+r histórico',
  working: 'ctrl+o transcript  ctrl+b segundo plano',
  idle: 'esc esc voltar  ctrl+r histórico',
}

const es: Strings = {
  draft: 'shift+enter nueva línea  ctrl+r historial',
  working: 'ctrl+o transcript  ctrl+b segundo plano',
  idle: 'esc esc retroceder  ctrl+r historial',
}

export const STRINGS = { en, pt, es }
