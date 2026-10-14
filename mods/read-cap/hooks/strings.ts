const en = {
  capped: (path: string, kb: number, lines: number) => `read-cap: ${path} (${kb} KB) read up to line ${lines} only`,
}

type Strings = typeof en

const pt: Strings = {
  capped: (path, kb, lines) => `read-cap: ${path} (${kb} KB) lido só até a linha ${lines}`,
}

const es: Strings = {
  capped: (path, kb, lines) => `read-cap: ${path} (${kb} KB) leído solo hasta la línea ${lines}`,
}

export const STRINGS = { en, pt, es }
