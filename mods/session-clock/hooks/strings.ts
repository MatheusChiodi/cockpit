const en = {
  status: (elapsed: string, turns: number) => `session ${elapsed} · ${turns} prompts`,
}

type Strings = typeof en

const pt: Strings = {
  status: (elapsed, turns) => `sessão ${elapsed} · ${turns} prompts`,
}

const es: Strings = {
  status: (elapsed, turns) => `sesión ${elapsed} · ${turns} prompts`,
}

export const STRINGS = { en, pt, es }
