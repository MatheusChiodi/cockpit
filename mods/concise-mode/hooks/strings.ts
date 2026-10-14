const en = {
  description: 'Turns concise mode on or off (short, direct answers)',
  hint: '[on|off]',
  status: 'concise',
  changed: (isOn: boolean) => `Concise mode ${isOn ? 'on' : 'off'} (applies from the next prompt).`,
}

type Strings = typeof en

const pt: Strings = {
  description: 'Liga/desliga o modo conciso (respostas curtas e diretas)',
  hint: '[on|off]',
  status: 'conciso',
  changed: isOn => `Modo conciso ${isOn ? 'ligado' : 'desligado'} (vale a partir do próximo prompt).`,
}

const es: Strings = {
  description: 'Activa/desactiva el modo conciso (respuestas cortas y directas)',
  hint: '[on|off]',
  status: 'conciso',
  changed: isOn => `Modo conciso ${isOn ? 'activado' : 'desactivado'} (vale desde el próximo prompt).`,
}

export const STRINGS = { en, pt, es }
