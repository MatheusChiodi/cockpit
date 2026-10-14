const en = {
  locale: 'en-US',
  command: 'The five tool results that took the most context this session',
  none: 'No tool results yet this session.',
  title: (tokens: string, calls: number) => `Heaviest results (about ${tokens} tokens in ${calls} calls)`,
  tok: 'tok',
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  command: 'Os cinco resultados de ferramenta que mais gastaram contexto na sessão',
  none: 'Nenhum resultado de ferramenta ainda nesta sessão.',
  title: (tokens, calls) => `Resultados mais pesados (cerca de ${tokens} tokens em ${calls} chamadas)`,
  tok: 'tok',
}

const es: Strings = {
  locale: 'es-ES',
  command: 'Los cinco resultados de herramienta que más contexto gastaron en la sesión',
  none: 'Aún no hay resultados de herramientas en esta sesión.',
  title: (tokens, calls) => `Resultados más pesados (unos ${tokens} tokens en ${calls} llamadas)`,
  tok: 'tok',
}

export const STRINGS = { en, pt, es }
