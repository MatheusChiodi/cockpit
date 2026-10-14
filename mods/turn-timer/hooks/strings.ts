const en = {
  label: 'turn',
  hide: 'Hide',
  detail: (tools: number, tokens: string, isAborted: boolean) =>
    `${tools} tools  ${tokens} tokens${isAborted ? '  interrupted' : ''}`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'turno',
  hide: 'Ocultar',
  detail: (tools, tokens, isAborted) => `${tools} tools  ${tokens} tokens${isAborted ? '  interrompido' : ''}`,
}

const es: Strings = {
  label: 'turno',
  hide: 'Ocultar',
  detail: (tools, tokens, isAborted) => `${tools} tools  ${tokens} tokens${isAborted ? '  interrumpido' : ''}`,
}

export const STRINGS = { en, pt, es }
