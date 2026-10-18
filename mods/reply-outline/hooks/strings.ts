const en = {
  command: 'Open a pane with the headings, file references and links of the last reply',
  opened: 'Outline opened.',
  title: 'outline',
  paneTitle: 'Outline',
  summary: (headings: number, files: number, links: number) => `${headings} headings  ${files} files  ${links} links`,
  headings: 'headings',
  files: 'files',
  links: 'links',
  empty: 'No reply yet. After the first answer this pane lists its headings, the files it mentions and its links.',
  nothing: 'The last reply has no headings, file references or links.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre um painel com os títulos, as referências a arquivos e os links da última resposta',
  opened: 'Estrutura aberta.',
  title: 'estrutura',
  paneTitle: 'Estrutura',
  summary: (headings, files, links) => `${headings} títulos  ${files} arquivos  ${links} links`,
  headings: 'títulos',
  files: 'arquivos',
  links: 'links',
  empty: 'Nenhuma resposta ainda. Depois da primeira resposta este painel lista os títulos, os arquivos citados e os links.',
  nothing: 'A última resposta não tem títulos, referências a arquivos nem links.',
}

const es: Strings = {
  command: 'Abre un panel con los títulos, las referencias a archivos y los enlaces de la última respuesta',
  opened: 'Estructura abierta.',
  title: 'estructura',
  paneTitle: 'Estructura',
  summary: (headings, files, links) => `${headings} títulos  ${files} archivos  ${links} enlaces`,
  headings: 'títulos',
  files: 'archivos',
  links: 'enlaces',
  empty: 'Aún no hay respuesta. Tras la primera respuesta este panel lista sus títulos, los archivos que cita y sus enlaces.',
  nothing: 'La última respuesta no tiene títulos, referencias a archivos ni enlaces.',
}

export const STRINGS = { en, pt, es }
