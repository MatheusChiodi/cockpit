const en = {
  command: 'Turns on or off a file list and order before multi-file edits',
  hint: '[on|off]',
  status: 'plan',
  switched: (isOn: boolean) => `Plan-first mode ${isOn ? 'on' : 'off'} (applies from the next prompt).`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Liga/desliga a lista de arquivos e ordem antes de edições em vários arquivos',
  hint: '[on|off]',
  status: 'plano',
  switched: (isOn: boolean) => `Modo plano primeiro ${isOn ? 'ligado' : 'desligado'} (vale a partir do próximo prompt).`,
}

const es: Strings = {
  command: 'Activa o desactiva la lista de archivos y orden antes de editar varios archivos',
  hint: '[on|off]',
  status: 'plan',
  switched: (isOn: boolean) => `Modo plan primero ${isOn ? 'activado' : 'desactivado'} (vale desde el próximo prompt).`,
}

export const STRINGS = { en, pt, es }
