const en = {
  blocked: (tool: string, wrapper: string) =>
    `wrapper-guard blocked the command: this project ships ${wrapper}, which pins the ${tool === 'mvn' ? 'Maven' : 'Gradle'} version the build is made for. Run it with ${wrapper} instead of ${tool}.`,
  failed: 'wrapper-guard: the check failed, command refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: (tool, wrapper) =>
    `wrapper-guard bloqueou o comando: este projeto traz ${wrapper}, que fixa a versão do ${tool === 'mvn' ? 'Maven' : 'Gradle'} para a qual o build foi feito. Rode com ${wrapper} em vez de ${tool}.`,
  failed: 'wrapper-guard: a verificação falhou, comando recusado.',
}

const es: Strings = {
  blocked: (tool, wrapper) =>
    `wrapper-guard bloqueó el comando: este proyecto trae ${wrapper}, que fija la versión de ${tool === 'mvn' ? 'Maven' : 'Gradle'} para la que se hizo el build. Ejecútalo con ${wrapper} en lugar de ${tool}.`,
  failed: 'wrapper-guard: la verificación falló, comando rechazado.',
}

export const STRINGS = { en, pt, es }
