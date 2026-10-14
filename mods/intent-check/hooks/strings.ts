const en = {
  command: 'Say what this session is for; every 30 minutes of use a toast asks if you are still on it',
  hint: '<text> | clear',
  none: 'No intent set. Say it with /intent <text>.',
  current: (text: string) => `Intent: ${text}`,
  set: (text: string) => `Intent set: ${text}`,
  cleared: 'Intent cleared.',
  ask: (text: string) => `Still on: ${text}?`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Diga para que serve esta sessão; a cada 30 minutos de uso um toast pergunta se você ainda está nisso',
  hint: '<texto> | clear',
  none: 'Nenhuma intenção definida. Diga com /intent <texto>.',
  current: text => `Intenção: ${text}`,
  set: text => `Intenção definida: ${text}`,
  cleared: 'Intenção removida.',
  ask: text => `Ainda em: ${text}?`,
}

const es: Strings = {
  command: 'Di para qué sirve esta sesión; cada 30 minutos de uso un toast pregunta si sigues en ello',
  hint: '<texto> | clear',
  none: 'No hay intención definida. Dila con /intent <texto>.',
  current: text => `Intención: ${text}`,
  set: text => `Intención definida: ${text}`,
  cleared: 'Intención borrada.',
  ask: text => `¿Sigues en: ${text}?`,
}

export const STRINGS = { en, pt, es }
