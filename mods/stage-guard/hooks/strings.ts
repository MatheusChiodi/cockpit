const en = {
  blocked: (files: string) =>
    `stage-guard refused to stage everything: ${files} look like secrets. Add the files you want by name, or put these in .gitignore.`,
  failed: 'stage-guard: the check failed, command refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: files =>
    `stage-guard recusou adicionar tudo: ${files} parecem segredos. Adicione os arquivos desejados pelo nome ou coloque estes no .gitignore.`,
  failed: 'stage-guard: a verificação falhou, comando recusado.',
}

const es: Strings = {
  blocked: files =>
    `stage-guard rechazó agregar todo: ${files} parecen secretos. Agrega los archivos que quieres por nombre o ponlos en .gitignore.`,
  failed: 'stage-guard: la verificación falló, comando rechazado.',
}

export const STRINGS = { en, pt, es }
