const en = {
  blocked: (why: string) =>
    `kill-guard blocked the command: ${why}. Kill one explicit pid instead, or ask the user to run it by hand.`,
  failed: 'kill-guard: the check failed, command refused.',
  everyone: 'sending a signal to every process (kill -1)',
  killall: 'killing every process by name (killall)',
  pkill: (pattern: string) => (pattern === '' ? 'pkill with no pattern' : `pkill with a loose pattern "${pattern}"`),
  taskkill: (name: string) => `killing every "${name}" process (taskkill /IM)`,
  stopProcess: (name: string) => `stopping processes by wildcard "${name}" (Stop-Process)`,
  stopAll: 'stopping every process (Get-Process | Stop-Process)',
}

export type Strings = typeof en

const pt: Strings = {
  blocked: why =>
    `kill-guard bloqueou o comando: ${why}. Encerre um pid explícito, ou peça ao usuário para rodar manualmente.`,
  failed: 'kill-guard: a verificação falhou, comando recusado.',
  everyone: 'enviar um sinal a todos os processos (kill -1)',
  killall: 'encerrar todos os processos por nome (killall)',
  pkill: pattern => (pattern === '' ? 'pkill sem padrão' : `pkill com padrão solto "${pattern}"`),
  taskkill: name => `encerrar todos os processos "${name}" (taskkill /IM)`,
  stopProcess: name => `parar processos por curinga "${name}" (Stop-Process)`,
  stopAll: 'parar todos os processos (Get-Process | Stop-Process)',
}

const es: Strings = {
  blocked: why =>
    `kill-guard bloqueó el comando: ${why}. Termina un pid explícito, o pide al usuario que lo ejecute a mano.`,
  failed: 'kill-guard: la verificación falló, comando rechazado.',
  everyone: 'enviar una señal a todos los procesos (kill -1)',
  killall: 'terminar todos los procesos por nombre (killall)',
  pkill: pattern => (pattern === '' ? 'pkill sin patrón' : `pkill con patrón suelto "${pattern}"`),
  taskkill: name => `terminar todos los procesos "${name}" (taskkill /IM)`,
  stopProcess: name => `detener procesos con comodín "${name}" (Stop-Process)`,
  stopAll: 'detener todos los procesos (Get-Process | Stop-Process)',
}

export const STRINGS = { en, pt, es }
