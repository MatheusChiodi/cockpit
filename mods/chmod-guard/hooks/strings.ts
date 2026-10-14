const en = {
  blocked: (why: string) =>
    `chmod-guard blocked the command: ${why}. Use a narrower permission, or ask the user to run it by hand.`,
  failed: 'chmod-guard: the check failed, command refused.',
  worldWritable: (mode: string) => `making files writable by everyone (chmod ${mode})`,
  ownership: (target: string) => `changing ownership recursively on "${target}"`,
  icacls: 'granting Everyone write access (icacls)',
}

export type Strings = typeof en

const pt: Strings = {
  blocked: why =>
    `chmod-guard bloqueou o comando: ${why}. Use uma permissão mais restrita, ou peça ao usuário para rodar manualmente.`,
  failed: 'chmod-guard: a verificação falhou, comando recusado.',
  worldWritable: mode => `deixar arquivos graváveis por todos (chmod ${mode})`,
  ownership: target => `trocar o dono recursivamente em "${target}"`,
  icacls: 'dar acesso de escrita a Everyone (icacls)',
}

const es: Strings = {
  blocked: why =>
    `chmod-guard bloqueó el comando: ${why}. Usa un permiso más restringido, o pide al usuario que lo ejecute a mano.`,
  failed: 'chmod-guard: la verificación falló, comando rechazado.',
  worldWritable: mode => `dejar archivos con escritura para todos (chmod ${mode})`,
  ownership: target => `cambiar el propietario recursivamente en "${target}"`,
  icacls: 'dar acceso de escritura a Everyone (icacls)',
}

export const STRINGS = { en, pt, es }
