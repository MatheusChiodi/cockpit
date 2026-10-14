const en = {
  command: 'Turns on or off a short explanation of each change',
  hint: '[on|off]',
  status: 'explain',
  switched: (isOn: boolean) => `Explain mode ${isOn ? 'on' : 'off'} (applies from the next prompt).`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Liga/desliga a explicação curta de cada mudança',
  hint: '[on|off]',
  status: 'explicar',
  switched: (isOn: boolean) => `Modo explicar ${isOn ? 'ligado' : 'desligado'} (vale a partir do próximo prompt).`,
}

const es: Strings = {
  command: 'Activa o desactiva la explicación corta de cada cambio',
  hint: '[on|off]',
  status: 'explicar',
  switched: (isOn: boolean) => `Modo explicar ${isOn ? 'activado' : 'desactivado'} (vale desde el próximo prompt).`,
}

export const STRINGS = { en, pt, es }
