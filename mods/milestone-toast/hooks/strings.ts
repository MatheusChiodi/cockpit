const en = {
  reached: (count: number) => `${count} prompts in this session`,
}

type Strings = typeof en

const pt: Strings = {
  reached: count => `${count} prompts nesta sessão`,
}

const es: Strings = {
  reached: count => `${count} prompts en esta sesión`,
}

export const STRINGS = { en, pt, es }
