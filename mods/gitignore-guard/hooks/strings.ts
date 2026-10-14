const en = {
  failed: 'gitignore-guard: the check failed, confirm before continuing.',
  removed: (where: string, detail: string) =>
    `gitignore-guard: removes ${detail} from ${where}. The files it protected can then be committed with their secrets; keep the entry, and use git add -f for a deliberate exception.`,
  force: (where: string, detail: string) =>
    `gitignore-guard: force-adds ${detail} past .gitignore (${where}). The file was ignored on purpose and a committed secret stays in the history; keep it out, or commit a .example copy instead.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'gitignore-guard: a verificação falhou, confirme antes de continuar.',
  removed: (where, detail) =>
    `gitignore-guard: remove ${detail} de ${where}. Os arquivos que ele protegia podem ser commitados com seus segredos; mantenha a entrada e use git add -f numa exceção deliberada.`,
  force: (where, detail) =>
    `gitignore-guard: força ${detail} para dentro do commit, passando por cima do .gitignore (${where}). O arquivo era ignorado de propósito e um segredo commitado fica no histórico; deixe de fora ou commite uma cópia .example.`,
}

const es: Strings = {
  failed: 'gitignore-guard: la verificación falló, confirma antes de continuar.',
  removed: (where, detail) =>
    `gitignore-guard: quita ${detail} de ${where}. Los archivos que protegía podrían commitearse con sus secretos; conserva la entrada y usa git add -f para una excepción deliberada.`,
  force: (where, detail) =>
    `gitignore-guard: fuerza ${detail} dentro del commit pasando por encima de .gitignore (${where}). El archivo se ignoraba a propósito y un secreto commiteado queda en el historial; déjalo fuera o commitea una copia .example.`,
}

export const STRINGS = { en, pt, es }
