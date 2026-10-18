const en = {
  tools: (count: number) => (count === 1 ? '1 tool' : `${count} tools`),
  files: (count: number) => (count === 1 ? '1 file changed' : `${count} files changed`),
  failed: (count: number) => `${count} failed`,
}

type Strings = typeof en

const pt: Strings = {
  tools: count => (count === 1 ? '1 ferramenta' : `${count} ferramentas`),
  files: count => (count === 1 ? '1 arquivo alterado' : `${count} arquivos alterados`),
  failed: count => (count === 1 ? '1 falhou' : `${count} falharam`),
}

const es: Strings = {
  tools: count => (count === 1 ? '1 herramienta' : `${count} herramientas`),
  files: count => (count === 1 ? '1 archivo cambiado' : `${count} archivos cambiados`),
  failed: count => (count === 1 ? '1 falló' : `${count} fallaron`),
}

export const STRINGS = { en, pt, es }
