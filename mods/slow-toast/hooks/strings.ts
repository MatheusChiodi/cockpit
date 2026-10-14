const en = {
  slow: (command: string, took: string) => `slow command: ${command} took ${took}`,
}

type Strings = typeof en

const pt: Strings = {
  slow: (command, took) => `comando lento: ${command} levou ${took}`,
}

const es: Strings = {
  slow: (command, took) => `comando lento: ${command} tardó ${took}`,
}

export const STRINGS = { en, pt, es }
