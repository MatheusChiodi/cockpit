const en = {
  blocked: (what: string) =>
    `debugger-guard blocked the edit: it adds ${what}. A leftover breakpoint freezes the program; remove it.`,
  failed: 'debugger-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: what =>
    `debugger-guard bloqueou a edição: ela adiciona ${what}. Um breakpoint esquecido trava o programa; remova-o.`,
  failed: 'debugger-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: what =>
    `debugger-guard bloqueó la edición: añade ${what}. Un breakpoint olvidado congela el programa; quítalo.`,
  failed: 'debugger-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
