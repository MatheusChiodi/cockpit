const en = {
  label: 'goal',
  command: "Pins the project goal above the prompt and in Claude's context; /goal clear removes it",
  hint: '<goal> | clear',
  none: 'No goal. Use /goal <goal>.',
  current: (goal: string) => `Goal: ${goal}`,
  removed: 'Goal removed.',
  pinned: 'Goal pinned (Claude sees it from the next prompt).',
}

type Strings = typeof en

const pt: Strings = {
  label: 'objetivo',
  command: 'Fixa o objetivo do projeto acima do prompt e no contexto do Claude; /goal clear remove',
  hint: '<objetivo> | clear',
  none: 'Sem objetivo. Use /goal <objetivo>.',
  current: goal => `Objetivo: ${goal}`,
  removed: 'Objetivo removido.',
  pinned: 'Objetivo fixado (o Claude passa a vê-lo no próximo prompt).',
}

const es: Strings = {
  label: 'objetivo',
  command: 'Fija el objetivo del proyecto sobre el prompt y en el contexto de Claude; /goal clear lo quita',
  hint: '<objetivo> | clear',
  none: 'Sin objetivo. Usa /goal <objetivo>.',
  current: goal => `Objetivo: ${goal}`,
  removed: 'Objetivo eliminado.',
  pinned: 'Objetivo fijado (Claude lo verá desde el próximo prompt).',
}

export const STRINGS = { en, pt, es }
