const en = {
  failed: 'dynamic-exec-guard: the check failed, confirm before continuing.',
  eval: (where: string) =>
    `dynamic-exec-guard: adds eval or new Function to ${where}. Any text that reaches it runs as code; use JSON.parse, a lookup table or a real parser instead.`,
  html: (where: string) =>
    `dynamic-exec-guard: writes raw HTML into the page in ${where}. Unsanitised input becomes script (XSS); use textContent, or sanitise it with DOMPurify first.`,
  exec: (where: string) =>
    `dynamic-exec-guard: builds a shell command from a variable in ${where}. Input with a quote or a semicolon becomes a second command; pass the arguments as a list instead.`,
}

type Strings = typeof en

const pt: Strings = {
  failed: 'dynamic-exec-guard: a verificação falhou, confirme antes de continuar.',
  eval: where =>
    `dynamic-exec-guard: adiciona eval ou new Function em ${where}. Qualquer texto que chegue nele roda como código; use JSON.parse, uma tabela de busca ou um parser de verdade.`,
  html: where =>
    `dynamic-exec-guard: escreve HTML cru na página em ${where}. Entrada sem sanitizar vira script (XSS); use textContent ou sanitize com DOMPurify antes.`,
  exec: where =>
    `dynamic-exec-guard: monta um comando de shell a partir de uma variável em ${where}. Uma entrada com aspas ou ponto e vírgula vira um segundo comando; passe os argumentos como lista.`,
}

const es: Strings = {
  failed: 'dynamic-exec-guard: la verificación falló, confirma antes de continuar.',
  eval: where =>
    `dynamic-exec-guard: agrega eval o new Function en ${where}. Cualquier texto que llegue ahí se ejecuta como código; usa JSON.parse, una tabla de búsqueda o un parser real.`,
  html: where =>
    `dynamic-exec-guard: escribe HTML crudo en la página en ${where}. La entrada sin sanear se vuelve script (XSS); usa textContent o sanea con DOMPurify antes.`,
  exec: where =>
    `dynamic-exec-guard: arma un comando de shell a partir de una variable en ${where}. Una entrada con comillas o punto y coma se vuelve un segundo comando; pasa los argumentos como lista.`,
}

export type What = 'eval' | 'html' | 'exec'

export const STRINGS = { en, pt, es }
