const en = {
  denied: (path: string) =>
    `generated-guard: ${path} is in a generated or dependency folder. Change the source code and generate it again.`,
  failed: 'generated-guard: the check failed, edit refused.',
}

type Strings = typeof en

const pt: Strings = {
  denied: path =>
    `generated-guard: ${path} fica em pasta gerada ou de dependências. Altere o código-fonte e gere de novo.`,
  failed: 'generated-guard: a verificação falhou, edição recusada.',
}

const es: Strings = {
  denied: path =>
    `generated-guard: ${path} está en una carpeta generada o de dependencias. Cambia el código fuente y genéralo de nuevo.`,
  failed: 'generated-guard: la verificación falló, edición rechazada.',
}

export const STRINGS = { en, pt, es }
