const en = {
  ask: (what: string) => `upload-guard: ${what}. Confirm before running.`,
  failed: 'upload-guard: the check failed, confirm manually.',
  curl: 'sends a local file out (curl upload)',
  wget: 'sends a local file out (wget --post-file)',
  invoke: 'sends a local file out (-InFile)',
  copy: (target: string) => `copies files to a remote host (${target})`,
  nc: 'sends a local file over a raw connection (nc)',
}

type Strings = typeof en

const pt: Strings = {
  ask: what => `upload-guard: ${what}. Confirme antes de rodar.`,
  failed: 'upload-guard: a verificação falhou, confirme manualmente.',
  curl: 'envia um arquivo local para fora (upload com curl)',
  wget: 'envia um arquivo local para fora (wget --post-file)',
  invoke: 'envia um arquivo local para fora (-InFile)',
  copy: target => `copia arquivos para um host remoto (${target})`,
  nc: 'envia um arquivo local por uma conexão direta (nc)',
}

const es: Strings = {
  ask: what => `upload-guard: ${what}. Confirma antes de ejecutar.`,
  failed: 'upload-guard: la verificación falló, confirma manualmente.',
  curl: 'envía un archivo local al exterior (subida con curl)',
  wget: 'envía un archivo local al exterior (wget --post-file)',
  invoke: 'envía un archivo local al exterior (-InFile)',
  copy: target => `copia archivos a un host remoto (${target})`,
  nc: 'envía un archivo local por una conexión directa (nc)',
}

export type { Strings }

export const STRINGS = { en, pt, es }
