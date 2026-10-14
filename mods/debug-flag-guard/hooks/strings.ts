const en = {
  failed: 'debug-flag-guard: the check failed, confirm before continuing.',
  debug: (where: string) =>
    `debug-flag-guard: turns a debug flag on in ${where}. In production it exposes stack traces and an interactive console; read it from the environment and default to off.`,
  exposure: (where: string) =>
    `debug-flag-guard: exposes every management endpoint or the H2 console in ${where}. They leak configuration and allow remote access; expose only health and info.`,
  prodDebug: (where: string) =>
    `debug-flag-guard: sets a debug or development flag in ${where}, a production file. Leave it off there and keep debug settings in the development config.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'debug-flag-guard: a verificação falhou, confirme antes de continuar.',
  debug: where =>
    `debug-flag-guard: liga uma flag de debug em ${where}. Em produção ela expõe stack traces e um console interativo; leia do ambiente e deixe desligada por padrão.`,
  exposure: where =>
    `debug-flag-guard: expõe todos os endpoints de gerenciamento ou o console H2 em ${where}. Eles vazam configuração e permitem acesso remoto; exponha só health e info.`,
  prodDebug: where =>
    `debug-flag-guard: define uma flag de debug ou desenvolvimento em ${where}, um arquivo de produção. Deixe desligada ali e mantenha o debug na configuração de desenvolvimento.`,
}

const es: Strings = {
  failed: 'debug-flag-guard: la verificación falló, confirma antes de continuar.',
  debug: where =>
    `debug-flag-guard: activa una bandera de debug en ${where}. En producción expone stack traces y una consola interactiva; léela del entorno y déjala apagada por defecto.`,
  exposure: where =>
    `debug-flag-guard: expone todos los endpoints de gestión o la consola H2 en ${where}. Filtran configuración y permiten acceso remoto; expón solo health e info.`,
  prodDebug: where =>
    `debug-flag-guard: define una bandera de debug o desarrollo en ${where}, un archivo de producción. Déjala apagada ahí y mantén el debug en la configuración de desarrollo.`,
}

export type What = 'debug' | 'exposure' | 'prodDebug'

export const STRINGS = { en, pt, es }
