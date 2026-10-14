const en = {
  logs: (count: number) => `${count} debug ${count === 1 ? 'log' : 'logs'}`,
  todos: (count: number) => `${count} ${count === 1 ? 'TODO' : 'TODOs'}`,
  left: (parts: string) => `Left behind: ${parts}`,
}

type Strings = typeof en

const pt: Strings = {
  logs: count => `${count} ${count === 1 ? 'log' : 'logs'} de debug`,
  todos: count => `${count} ${count === 1 ? 'TODO' : 'TODOs'}`,
  left: parts => `Ficou para trás: ${parts}`,
}

const es: Strings = {
  logs: count => `${count} ${count === 1 ? 'log' : 'logs'} de depuración`,
  todos: count => `${count} ${count === 1 ? 'TODO' : 'TODOs'}`,
  left: parts => `Quedó atrás: ${parts}`,
}

export const STRINGS = { en, pt, es }
