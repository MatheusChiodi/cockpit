const en = {
  command: 'Set the answer shape: bullets, steps, table, prose, or off',
  hint: '[bullets|steps|table|prose|off]',
  current: (mode: string) => `Answer format: ${mode}. Use /format off to clear it.`,
  none: 'No answer format set. Use /format bullets|steps|table|prose.',
  set: (mode: string) => `Answer format set to ${mode} (applies from the next prompt).`,
  cleared: 'Answer format cleared.',
  unknown: (value: string) => `Unknown format: ${value}. Use bullets, steps, table, prose or off.`,
  status: (mode: string) => `format ${mode}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Define o formato das respostas: bullets, steps, table, prose ou off',
  hint: '[bullets|steps|table|prose|off]',
  current: mode => `Formato das respostas: ${mode}. Use /format off para limpar.`,
  none: 'Nenhum formato definido. Use /format bullets|steps|table|prose.',
  set: mode => `Formato das respostas definido como ${mode} (vale a partir do próximo prompt).`,
  cleared: 'Formato das respostas removido.',
  unknown: value => `Formato desconhecido: ${value}. Use bullets, steps, table, prose ou off.`,
  status: mode => `formato ${mode}`,
}

const es: Strings = {
  command: 'Define el formato de las respuestas: bullets, steps, table, prose u off',
  hint: '[bullets|steps|table|prose|off]',
  current: mode => `Formato de respuestas: ${mode}. Usa /format off para quitarlo.`,
  none: 'No hay formato definido. Usa /format bullets|steps|table|prose.',
  set: mode => `Formato de respuestas definido en ${mode} (vale desde el próximo prompt).`,
  cleared: 'Formato de respuestas quitado.',
  unknown: value => `Formato desconocido: ${value}. Usa bullets, steps, table, prose u off.`,
  status: mode => `formato ${mode}`,
}

export const STRINGS = { en, pt, es }
