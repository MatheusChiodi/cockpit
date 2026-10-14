const en = {
  command: 'Set the hour of the quiet end-of-day summary: /dayend HH:MM, /dayend off, /dayend to see it',
  hint: 'HH:MM | off',
  set: (time: string) => `Day summary at ${time}.`,
  current: (time: string) => `Day summary at ${time}. /dayend HH:MM changes it, /dayend off turns it off.`,
  disabled: 'Day summary is off. /dayend HH:MM turns it on.',
  off: 'Day summary turned off.',
  usage: 'Give an hour as HH:MM, like /dayend 18:00, or off.',
  summary: (prompts: number, turns: number, edits: number) =>
    `Done for today? ${prompts} ${prompts === 1 ? 'prompt' : 'prompts'}, ${turns} ${turns === 1 ? 'turn' : 'turns'}, ${edits} ${edits === 1 ? 'edit' : 'edits'}. Good work.`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Define a hora do resumo discreto do fim do dia: /dayend HH:MM, /dayend off, /dayend para ver',
  hint: 'HH:MM | off',
  set: time => `Resumo do dia às ${time}.`,
  current: time => `Resumo do dia às ${time}. /dayend HH:MM muda, /dayend off desliga.`,
  disabled: 'Resumo do dia desligado. /dayend HH:MM liga.',
  off: 'Resumo do dia desligado.',
  usage: 'Informe a hora como HH:MM, por exemplo /dayend 18:00, ou off.',
  summary: (prompts, turns, edits) =>
    `Por hoje chega? ${prompts} ${prompts === 1 ? 'prompt' : 'prompts'}, ${turns} ${turns === 1 ? 'turno' : 'turnos'}, ${edits} ${edits === 1 ? 'edição' : 'edições'}. Bom trabalho.`,
}

const es: Strings = {
  command: 'Define la hora del resumen discreto del final del día: /dayend HH:MM, /dayend off, /dayend para verla',
  hint: 'HH:MM | off',
  set: time => `Resumen del día a las ${time}.`,
  current: time => `Resumen del día a las ${time}. /dayend HH:MM lo cambia, /dayend off lo apaga.`,
  disabled: 'Resumen del día apagado. /dayend HH:MM lo enciende.',
  off: 'Resumen del día apagado.',
  usage: 'Indica la hora como HH:MM, por ejemplo /dayend 18:00, u off.',
  summary: (prompts, turns, edits) =>
    `¿Por hoy es suficiente? ${prompts} ${prompts === 1 ? 'prompt' : 'prompts'}, ${turns} ${turns === 1 ? 'turno' : 'turnos'}, ${edits} ${edits === 1 ? 'edición' : 'ediciones'}. Buen trabajo.`,
}

export const STRINGS = { en, pt, es }
