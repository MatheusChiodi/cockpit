const en = {
  locale: 'en-US',
  command: 'Session summary: time, prompts, tools, tokens, context and cost',
  session: (elapsed: string, cwd: string) => `Session     ${elapsed} in ${cwd}`,
  model: 'Model       ',
  prompts: 'Prompts     ',
  tools: (count: number, failures: number) => `Tools       ${count} (${failures} failed or blocked)`,
  output: (tokens: string) => `Output      ${tokens} tokens`,
  context: (percent: number, window: string) => `Context     ${percent}% of ${window} tokens`,
  cost: (usd: string | undefined) => `Cost        ${usd === undefined ? 'n/a' : `$${usd}`}`,
}

type Strings = typeof en

const pt: Strings = {
  locale: 'pt-BR',
  command: 'Resumo da sessão: tempo, prompts, tools, tokens, contexto e custo',
  session: (elapsed, cwd) => `Sessão      ${elapsed} em ${cwd}`,
  model: 'Modelo      ',
  prompts: 'Prompts     ',
  tools: (count, failures) => `Tools       ${count} (${failures} com erro ou bloqueadas)`,
  output: tokens => `Saída       ${tokens} tokens`,
  context: (percent, window) => `Contexto    ${percent}% de ${window} tokens`,
  cost: usd => `Custo       ${usd === undefined ? 'n/d' : `US$ ${usd}`}`,
}

const es: Strings = {
  locale: 'es-ES',
  command: 'Resumen de la sesión: tiempo, prompts, tools, tokens, contexto y coste',
  session: (elapsed, cwd) => `Sesión      ${elapsed} en ${cwd}`,
  model: 'Modelo      ',
  prompts: 'Prompts     ',
  tools: (count, failures) => `Tools       ${count} (${failures} con error o bloqueadas)`,
  output: tokens => `Salida      ${tokens} tokens`,
  context: (percent, window) => `Contexto    ${percent}% de ${window} tokens`,
  cost: usd => `Coste       ${usd === undefined ? 'n/d' : `US$ ${usd}`}`,
}

export const STRINGS = { en, pt, es }
