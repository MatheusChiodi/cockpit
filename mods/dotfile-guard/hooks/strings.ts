const en = {
  blocked: (path: string) =>
    `dotfile-guard blocked the edit: ${path} is a personal shell or tool profile outside the project. If it really is intended, ask the user to edit it by hand.`,
  failed: 'dotfile-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: path =>
    `dotfile-guard bloqueou a edição: ${path} é um perfil pessoal de shell ou ferramenta fora do projeto. Se for mesmo intencional, peça ao usuário para editar manualmente.`,
  failed: 'dotfile-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: path =>
    `dotfile-guard bloqueó la edición: ${path} es un perfil personal de shell o herramienta fuera del proyecto. Si de verdad es intencional, pide al usuario que lo edite a mano.`,
  failed: 'dotfile-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
