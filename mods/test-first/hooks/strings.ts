const en = {
  command: 'Turns test-first development on or off',
  hint: '[on|off]',
  status: 'tdd',
  switched: (isOn: boolean) => `Test-first mode ${isOn ? 'on' : 'off'} (applies from the next prompt).`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Liga/desliga o desenvolvimento test-first (teste antes do código)',
  hint: '[on|off]',
  status: 'tdd',
  switched: (isOn: boolean) => `Modo test-first ${isOn ? 'ligado' : 'desligado'} (vale a partir do próximo prompt).`,
}

const es: Strings = {
  command: 'Activa o desactiva el desarrollo test-first (prueba antes del código)',
  hint: '[on|off]',
  status: 'tdd',
  switched: (isOn: boolean) => `Modo test-first ${isOn ? 'activado' : 'desactivado'} (vale desde el próximo prompt).`,
}

export const STRINGS = { en, pt, es }
