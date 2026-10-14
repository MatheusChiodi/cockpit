const en = {
  ask: (host: string) => `registry-guard: points packages at ${host}. Confirm.`,
  failed: 'registry-guard: the check failed, confirm manually.',
}

type Strings = typeof en

const pt: Strings = {
  ask: host => `registry-guard: aponta os pacotes para ${host}. Confirme.`,
  failed: 'registry-guard: a verificação falhou, confirme manualmente.',
}

const es: Strings = {
  ask: host => `registry-guard: apunta los paquetes a ${host}. Confirma.`,
  failed: 'registry-guard: la verificación falló, confirma manualmente.',
}

export const STRINGS = { en, pt, es }
