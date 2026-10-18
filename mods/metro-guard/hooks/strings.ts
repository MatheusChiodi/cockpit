const en = {
  running: (port: number) =>
    `metro-guard: Metro is already running on port ${port}. A second one asks for another port and the app keeps loading from the first. Reuse the running bundler, or stop it before starting a new one.`,
  failed: 'metro-guard: the check failed, confirm no Metro bundler is already running.',
}

type Strings = typeof en

const pt: Strings = {
  running: port =>
    `metro-guard: o Metro já está rodando na porta ${port}. Um segundo pede outra porta e o app continua carregando do primeiro. Reaproveite o bundler que está rodando ou pare-o antes de iniciar outro.`,
  failed: 'metro-guard: a verificação falhou, confirme que nenhum bundler Metro já está rodando.',
}

const es: Strings = {
  running: port =>
    `metro-guard: Metro ya está corriendo en el puerto ${port}. Un segundo pide otro puerto y la app sigue cargando del primero. Reutiliza el bundler que corre o detenlo antes de iniciar otro.`,
  failed: 'metro-guard: la verificación falló, confirma que ningún bundler Metro está corriendo.',
}

export const STRINGS = { en, pt, es }
