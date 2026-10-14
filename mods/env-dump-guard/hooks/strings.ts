const en = {
  blocked: (why: string) =>
    `env-dump-guard blocked the command: ${why}. Read one named variable instead, for example printenv HOME.`,
  failed: 'env-dump-guard: the check failed, command refused.',
  env: (command: string) => `listing the whole environment (${command})`,
  powershell: 'listing the whole environment (Env:)',
}

export type Strings = typeof en

const pt: Strings = {
  blocked: why =>
    `env-dump-guard bloqueou o comando: ${why}. Leia uma variável pelo nome, por exemplo printenv HOME.`,
  failed: 'env-dump-guard: a verificação falhou, comando recusado.',
  env: command => `listar o ambiente inteiro (${command})`,
  powershell: 'listar o ambiente inteiro (Env:)',
}

const es: Strings = {
  blocked: why =>
    `env-dump-guard bloqueó el comando: ${why}. Lee una variable por su nombre, por ejemplo printenv HOME.`,
  failed: 'env-dump-guard: la verificación falló, comando rechazado.',
  env: command => `listar todo el entorno (${command})`,
  powershell: 'listar todo el entorno (Env:)',
}

export const STRINGS = { en, pt, es }
