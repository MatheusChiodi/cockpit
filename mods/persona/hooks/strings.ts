const en = {
  description: (names: string) => `Switches Claude's persona (${names}, off)`,
  hint: '[name|off]',
  current: (held: string | undefined, names: string) =>
    `Current persona: ${held ?? 'none'}. Options: ${names}, off.`,
  off: 'Persona turned off.',
  unknown: (wanted: string, names: string) => `Unknown persona: ${wanted}. Options: ${names}, off.`,
  active: (wanted: string) => `Persona "${wanted}" active from the next prompt.`,
}

type Strings = typeof en

const pt: Strings = {
  description: names => `Troca a persona do Claude (${names}, off)`,
  hint: '[nome|off]',
  current: (held, names) => `Persona atual: ${held ?? 'nenhuma'}. Opções: ${names}, off.`,
  off: 'Persona desligada.',
  unknown: (wanted, names) => `Persona desconhecida: ${wanted}. Opções: ${names}, off.`,
  active: wanted => `Persona "${wanted}" ativa a partir do próximo prompt.`,
}

const es: Strings = {
  description: names => `Cambia la persona de Claude (${names}, off)`,
  hint: '[nombre|off]',
  current: (held, names) => `Persona actual: ${held ?? 'ninguna'}. Opciones: ${names}, off.`,
  off: 'Persona desactivada.',
  unknown: (wanted, names) => `Persona desconocida: ${wanted}. Opciones: ${names}, off.`,
  active: wanted => `Persona "${wanted}" activa desde el próximo prompt.`,
}

export const STRINGS = { en, pt, es }
