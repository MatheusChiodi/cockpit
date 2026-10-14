const en = {
  blocked: (message: string) =>
    `wip-commit-guard refused the commit: "${message}" says nothing about the change. Write a message that says what changed and why.`,
  failed: 'wip-commit-guard: the check failed, command refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: message =>
    `wip-commit-guard recusou o commit: "${message}" não diz nada sobre a mudança. Escreva uma mensagem que diga o que mudou e por quê.`,
  failed: 'wip-commit-guard: a verificação falhou, comando recusado.',
}

const es: Strings = {
  blocked: message =>
    `wip-commit-guard rechazó el commit: "${message}" no dice nada sobre el cambio. Escribe un mensaje que diga qué cambió y por qué.`,
  failed: 'wip-commit-guard: la verificación falló, comando rechazado.',
}

export const STRINGS = { en, pt, es }
