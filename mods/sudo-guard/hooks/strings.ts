const en = {
  blocked: (why: string) =>
    `sudo-guard blocked the command: ${why}. Run it without elevation, or ask the user to run it by hand.`,
  failed: 'sudo-guard: the check failed, command refused.',
  sudo: 'privilege elevation (sudo, doas)',
  su: 'running a command as another user (su -c)',
  runas: 'running a program as another user (runas)',
  runAs: 'starting an elevated process (Start-Process -Verb RunAs)',
}

type Strings = typeof en

const pt: Strings = {
  blocked: why =>
    `sudo-guard bloqueou o comando: ${why}. Rode sem elevação, ou peça ao usuário para rodar manualmente.`,
  failed: 'sudo-guard: a verificação falhou, comando recusado.',
  sudo: 'elevação de privilégio (sudo, doas)',
  su: 'rodar um comando como outro usuário (su -c)',
  runas: 'rodar um programa como outro usuário (runas)',
  runAs: 'iniciar um processo elevado (Start-Process -Verb RunAs)',
}

const es: Strings = {
  blocked: why =>
    `sudo-guard bloqueó el comando: ${why}. Ejecútalo sin elevación, o pide al usuario que lo ejecute a mano.`,
  failed: 'sudo-guard: la verificación falló, comando rechazado.',
  sudo: 'elevación de privilegios (sudo, doas)',
  su: 'ejecutar un comando como otro usuario (su -c)',
  runas: 'ejecutar un programa como otro usuario (runas)',
  runAs: 'iniciar un proceso elevado (Start-Process -Verb RunAs)',
}

export type Reason = 'sudo' | 'su' | 'runas' | 'runAs'

export const STRINGS = { en, pt, es }
