const en = {
  command: 'Daily alarms at a local time, kept between sessions; /alarm list shows them, /alarm rm <n> removes one',
  hint: '<HH:MM> <text> | list | rm <n>',
  usage: 'Usage: /alarm <HH:MM> <text>, /alarm list or /alarm rm <n>',
  added: (index: number, time: string, text: string) => `Alarm ${index} set for ${time} every day: ${text}`,
  empty: 'No alarms yet. Add one with /alarm <HH:MM> <text>.',
  missing: (value: string) => `No such alarm: ${value}`,
  removed: (index: number) => `Alarm ${index} removed.`,
  full: (max: number) => `Limit of ${max} alarms reached. Remove one with /alarm rm <n>.`,
  ring: (time: string, text: string) => `${time}  ${text}`,
  title: (time: string) => `Alarm ${time}`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Alarmes diários em um horário local, mantidos entre sessões; /alarm list mostra, /alarm rm <n> remove',
  hint: '<HH:MM> <texto> | list | rm <n>',
  usage: 'Uso: /alarm <HH:MM> <texto>, /alarm list ou /alarm rm <n>',
  added: (index, time, text) => `Alarme ${index} definido para ${time} todos os dias: ${text}`,
  empty: 'Nenhum alarme ainda. Adicione com /alarm <HH:MM> <texto>.',
  missing: value => `Alarme inexistente: ${value}`,
  removed: index => `Alarme ${index} removido.`,
  full: max => `Limite de ${max} alarmes atingido. Remova um com /alarm rm <n>.`,
  ring: (time, text) => `${time}  ${text}`,
  title: time => `Alarme ${time}`,
}

const es: Strings = {
  command: 'Alarmas diarias a una hora local, conservadas entre sesiones; /alarm list las muestra, /alarm rm <n> borra una',
  hint: '<HH:MM> <texto> | list | rm <n>',
  usage: 'Uso: /alarm <HH:MM> <texto>, /alarm list o /alarm rm <n>',
  added: (index, time, text) => `Alarma ${index} fijada a las ${time} todos los días: ${text}`,
  empty: 'Todavía no hay alarmas. Añade una con /alarm <HH:MM> <texto>.',
  missing: value => `No existe la alarma: ${value}`,
  removed: index => `Alarma ${index} borrada.`,
  full: max => `Límite de ${max} alarmas alcanzado. Borra una con /alarm rm <n>.`,
  ring: (time, text) => `${time}  ${text}`,
  title: time => `Alarma ${time}`,
}

export const STRINGS = { en, pt, es }
