const en = {
  toast: (what: string, minutes: number, typical: string) => `Subagent "${what}" running for ${minutes} min${typical}`,
  typical: (minutes: number) => `, others took about ${minutes} min`,
}

type Strings = typeof en

const pt: Strings = {
  toast: (what, minutes, typical) => `Subagente "${what}" rodando há ${minutes} min${typical}`,
  typical: minutes => `, os outros levaram cerca de ${minutes} min`,
}

const es: Strings = {
  toast: (what, minutes, typical) => `Subagente "${what}" lleva ${minutes} min en marcha${typical}`,
  typical: minutes => `, los otros tardaron unos ${minutes} min`,
}

export const STRINGS = { en, pt, es }
