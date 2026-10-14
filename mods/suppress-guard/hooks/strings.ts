const en = {
  blocked: (what: string) =>
    `suppress-guard blocked the edit: it adds ${what}. A blanket suppression hides the problem; fix the cause, or suppress one named rule with a reason.`,
  failed: 'suppress-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  blocked: what =>
    `suppress-guard bloqueou a edição: ela adiciona ${what}. Supressão genérica esconde o problema; corrija a causa ou suprima uma regra nomeada, com o motivo.`,
  failed: 'suppress-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  blocked: what =>
    `suppress-guard bloqueó la edición: añade ${what}. Una supresión genérica oculta el problema; corrige la causa o suprime una regla con nombre, con el motivo.`,
  failed: 'suppress-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
