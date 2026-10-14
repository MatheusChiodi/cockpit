const en = {
  outside: (path: string) =>
    `path-jail: ${path} is outside the project. Writes are only allowed inside the session root, the temp folder or ~/.claude.`,
  failed: 'path-jail: the check failed, write refused.',
}

type Strings = typeof en

const pt: Strings = {
  outside: path =>
    `path-jail: ${path} fica fora do projeto. Escritas só dentro da raiz da sessão, do temp ou de ~/.claude.`,
  failed: 'path-jail: a verificação falhou, escrita recusada.',
}

const es: Strings = {
  outside: path =>
    `path-jail: ${path} queda fuera del proyecto. Solo se escribe dentro de la raíz de la sesión, del temp o de ~/.claude.`,
  failed: 'path-jail: la verificación falló, escritura rechazada.',
}

export const STRINGS = { en, pt, es }
