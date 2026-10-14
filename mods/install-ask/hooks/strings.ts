const en = {
  confirm: 'install-ask: the command adds a new dependency. Confirm.',
  failed: 'install-ask: the check failed, confirm manually.',
}

type Strings = typeof en

const pt: Strings = {
  confirm: 'install-ask: o comando adiciona uma dependência nova. Confirme.',
  failed: 'install-ask: a verificação falhou, confirme manualmente.',
}

const es: Strings = {
  confirm: 'install-ask: el comando agrega una dependencia nueva. Confirma.',
  failed: 'install-ask: la verificación falló, confirma manualmente.',
}

export const STRINGS = { en, pt, es }
