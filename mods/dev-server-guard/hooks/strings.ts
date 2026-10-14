const en = {
  running: (port: number) => `dev-server-guard: something already answers on :${port}. Start another dev server?`,
  failed: 'dev-server-guard: the check failed, confirm no dev server is already running.',
}

type Strings = typeof en

const pt: Strings = {
  running: port => `dev-server-guard: algo já responde na porta :${port}. Subir outro servidor de desenvolvimento?`,
  failed: 'dev-server-guard: a verificação falhou, confirme que nenhum servidor de desenvolvimento está rodando.',
}

const es: Strings = {
  running: port => `dev-server-guard: algo ya responde en el puerto :${port}. ¿Iniciar otro servidor de desarrollo?`,
  failed: 'dev-server-guard: la verificación falló, confirma que no hay un servidor de desarrollo en marcha.',
}

export const STRINGS = { en, pt, es }
