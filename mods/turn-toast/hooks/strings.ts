const en = {
  summary: (took: string, tools: number, tokens: string) =>
    `Turn done: ${took} · ${tools} ${tools === 1 ? 'tool' : 'tools'} · ${tokens} tokens out`,
}

type Strings = typeof en

const pt: Strings = {
  summary: (took, tools, tokens) =>
    `Turno concluído: ${took} · ${tools} ${tools === 1 ? 'ferramenta' : 'ferramentas'} · ${tokens} tokens de saída`,
}

const es: Strings = {
  summary: (took, tools, tokens) =>
    `Turno terminado: ${took} · ${tools} ${tools === 1 ? 'herramienta' : 'herramientas'} · ${tokens} tokens de salida`,
}

export const STRINGS = { en, pt, es }
