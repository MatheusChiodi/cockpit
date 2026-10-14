const en = {
  failed: 'script-mode-guard: the check failed, confirm before continuing.',
  loose: (where: string) =>
    `script-mode-guard: loosens file permissions in ${where} (world-writable mode, umask 0 or Everyone). Any local user could change what runs; use 755 for scripts and 644 for data, or give access to one group.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'script-mode-guard: a verificação falhou, confirme antes de continuar.',
  loose: where =>
    `script-mode-guard: afrouxa permissões de arquivo em ${where} (modo gravável por todos, umask 0 ou Everyone). Qualquer usuário local poderia alterar o que roda; use 755 para scripts e 644 para dados, ou dê acesso a um grupo.`,
}

const es: Strings = {
  failed: 'script-mode-guard: la verificación falló, confirma antes de continuar.',
  loose: where =>
    `script-mode-guard: afloja permisos de archivo en ${where} (modo escribible por todos, umask 0 o Everyone). Cualquier usuario local podría cambiar lo que se ejecuta; usa 755 para scripts y 644 para datos, o da acceso a un grupo.`,
}

export type What = 'loose'

export const STRINGS = { en, pt, es }
