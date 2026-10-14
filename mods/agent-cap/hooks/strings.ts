const en = {
  command: 'Cap how many subagents run at once; /agentcap off removes it',
  hint: '<n> | off',
  usage: 'Usage: /agentcap <n> | off',
  set: (n: number) => `Subagent cap set to ${n}.`,
  off: 'Subagent cap removed.',
  current: (n: number) => `Subagent cap: ${n} at once.`,
  none: 'No subagent cap. Set one with /agentcap <n>.',
  ask: (running: number, limit: number) => `agent-cap: ${running} subagents already running (cap ${limit}). Start another?`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Limita quantos subagentes rodam ao mesmo tempo; /agentcap off remove',
  hint: '<n> | off',
  usage: 'Uso: /agentcap <n> | off',
  set: n => `Limite de subagentes definido em ${n}.`,
  off: 'Limite de subagentes removido.',
  current: n => `Limite de subagentes: ${n} ao mesmo tempo.`,
  none: 'Sem limite de subagentes. Defina com /agentcap <n>.',
  ask: (running, limit) => `agent-cap: ${running} subagentes já rodando (limite ${limit}). Iniciar mais um?`,
}

const es: Strings = {
  command: 'Limita cuántos subagentes corren a la vez; /agentcap off lo quita',
  hint: '<n> | off',
  usage: 'Uso: /agentcap <n> | off',
  set: n => `Límite de subagentes definido en ${n}.`,
  off: 'Límite de subagentes quitado.',
  current: n => `Límite de subagentes: ${n} a la vez.`,
  none: 'Sin límite de subagentes. Defínelo con /agentcap <n>.',
  ask: (running, limit) => `agent-cap: ya hay ${running} subagentes en marcha (límite ${limit}). ¿Iniciar otro?`,
}

export const STRINGS = { en, pt, es }
