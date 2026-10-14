const en = {
  find: 'tree-flood-guard: an unfiltered find lists node_modules and build output. Use git ls-files, Glob, or add -maxdepth or -name.',
  ls: 'tree-flood-guard: ls -R lists node_modules and build output. Use git ls-files, Glob, or list one folder.',
  dir: 'tree-flood-guard: a recursive listing includes node_modules and build output. Use git ls-files, Glob, or list one folder.',
  failed: 'tree-flood-guard: the check failed, command refused.',
}

type Strings = typeof en

const pt: Strings = {
  find: 'tree-flood-guard: um find sem filtro lista node_modules e a saída de build. Use git ls-files, Glob, ou acrescente -maxdepth ou -name.',
  ls: 'tree-flood-guard: ls -R lista node_modules e a saída de build. Use git ls-files, Glob, ou liste uma pasta.',
  dir: 'tree-flood-guard: uma listagem recursiva inclui node_modules e a saída de build. Use git ls-files, Glob, ou liste uma pasta.',
  failed: 'tree-flood-guard: a verificação falhou, comando recusado.',
}

const es: Strings = {
  find: 'tree-flood-guard: un find sin filtro lista node_modules y la salida de build. Usa git ls-files, Glob, o añade -maxdepth o -name.',
  ls: 'tree-flood-guard: ls -R lista node_modules y la salida de build. Usa git ls-files, Glob, o lista una carpeta.',
  dir: 'tree-flood-guard: un listado recursivo incluye node_modules y la salida de build. Usa git ls-files, Glob, o lista una carpeta.',
  failed: 'tree-flood-guard: la verificación falló, comando rechazado.',
}

export const STRINGS = { en, pt, es }
