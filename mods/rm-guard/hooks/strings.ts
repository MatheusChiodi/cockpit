const en = {
  blocked: (why: string) =>
    `rm-guard blocked the command: ${why}. If it really is intended, ask the user to run it by hand.`,
  failed: 'rm-guard: the check failed, command refused.',
  removal: (target: string) => `recursively deleting "${target}"`,
  mkfs: 'formatting a file system (mkfs)',
  dd: 'writing straight to a disk (dd)',
  redirect: 'redirecting output onto a disk',
  format: 'formatting a drive',
  wipe: 'formatting or wiping a disk',
  forkBomb: 'fork bomb',
  chmod: 'chmod -R 777 on the root',
}

type Strings = typeof en

const pt: Strings = {
  blocked: why =>
    `rm-guard bloqueou o comando: ${why}. Se for mesmo intencional, peça ao usuário para rodar manualmente.`,
  failed: 'rm-guard: a verificação falhou, comando recusado.',
  removal: target => `apagar recursivamente "${target}"`,
  mkfs: 'formatar um sistema de arquivos (mkfs)',
  dd: 'gravar direto em um disco (dd)',
  redirect: 'redirecionar saída para um disco',
  format: 'formatar um drive',
  wipe: 'formatar ou limpar um disco',
  forkBomb: 'fork bomb',
  chmod: 'chmod -R 777 na raiz',
}

const es: Strings = {
  blocked: why =>
    `rm-guard bloqueó el comando: ${why}. Si de verdad es intencional, pide al usuario que lo ejecute a mano.`,
  failed: 'rm-guard: la verificación falló, comando rechazado.',
  removal: target => `borrar recursivamente "${target}"`,
  mkfs: 'formatear un sistema de archivos (mkfs)',
  dd: 'escribir directo en un disco (dd)',
  redirect: 'redirigir la salida a un disco',
  format: 'formatear una unidad',
  wipe: 'formatear o limpiar un disco',
  forkBomb: 'fork bomb',
  chmod: 'chmod -R 777 en la raíz',
}

export type Reason = 'mkfs' | 'dd' | 'redirect' | 'format' | 'wipe' | 'forkBomb' | 'chmod'

export const STRINGS = { en, pt, es }
