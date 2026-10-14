const en = {
  command: 'Daily commit target for this repository: a toast at half and at the goal; /target off removes it',
  hint: '<n> commits | off',
  usage: (max: number) => `Usage: /target <n, 1 to ${max}> commits, or /target off`,
  set: (n: number) => `Daily target set: ${n} ${n === 1 ? 'commit' : 'commits'}`,
  off: 'Daily target removed.',
  none: 'No daily target here. Set one with /target <n> commits.',
  status: (n: number, count: number | undefined) =>
    count === undefined ? `Daily target: ${n} commits a day.` : `Daily target: ${count} of ${n} commits today.`,
  halfway: (count: number, n: number) => `Halfway there: ${count} of ${n} commits today`,
  reached: (count: number, n: number) => `Target reached: ${count} of ${n} commits today`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Meta diária de commits neste repositório: toast na metade e ao atingir; /target off remove',
  hint: '<n> commits | off',
  usage: max => `Uso: /target <n, de 1 a ${max}> commits, ou /target off`,
  set: n => `Meta diária definida: ${n} ${n === 1 ? 'commit' : 'commits'}`,
  off: 'Meta diária removida.',
  none: 'Nenhuma meta diária aqui. Defina com /target <n> commits.',
  status: (n, count) =>
    count === undefined ? `Meta diária: ${n} commits por dia.` : `Meta diária: ${count} de ${n} commits hoje.`,
  halfway: (count, n) => `Na metade: ${count} de ${n} commits hoje`,
  reached: (count, n) => `Meta atingida: ${count} de ${n} commits hoje`,
}

const es: Strings = {
  command: 'Meta diaria de commits en este repositorio: toast a la mitad y al alcanzarla; /target off la quita',
  hint: '<n> commits | off',
  usage: max => `Uso: /target <n, de 1 a ${max}> commits, o /target off`,
  set: n => `Meta diaria definida: ${n} ${n === 1 ? 'commit' : 'commits'}`,
  off: 'Meta diaria eliminada.',
  none: 'No hay meta diaria aquí. Defínela con /target <n> commits.',
  status: (n, count) =>
    count === undefined ? `Meta diaria: ${n} commits por día.` : `Meta diaria: ${count} de ${n} commits hoy.`,
  halfway: (count, n) => `A la mitad: ${count} de ${n} commits hoy`,
  reached: (count, n) => `Meta alcanzada: ${count} de ${n} commits hoy`,
}

export const STRINGS = { en, pt, es }
