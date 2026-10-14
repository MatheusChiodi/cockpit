const en = {
  command: 'Open the pane with the files read this session and how often; 3+ reads are flagged as wasted context',
  opened: 'Reads pane opened.',
  title: 'reads',
  paneTitle: 'Reads',
  summary: (files: number, wasted: number) => `${files} files  ${wasted} read 3+ times`,
  empty: 'No file read yet. This pane fills up as Claude reads files; 3 or more reads of one file are flagged.',
  wasted: 'wasted context',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com os arquivos lidos nesta sessão e quantas vezes; 3+ leituras são marcadas como contexto desperdiçado',
  opened: 'Painel de leituras aberto.',
  title: 'leituras',
  paneTitle: 'Leituras',
  summary: (files, wasted) => `${files} arquivos  ${wasted} lidos 3+ vezes`,
  empty: 'Nenhum arquivo lido ainda. O painel se preenche conforme Claude lê arquivos; 3 ou mais leituras do mesmo arquivo são marcadas.',
  wasted: 'contexto desperdiçado',
}

const es: Strings = {
  command: 'Abre el panel con los archivos leídos en esta sesión y cuántas veces; 3+ lecturas se marcan como contexto desperdiciado',
  opened: 'Panel de lecturas abierto.',
  title: 'lecturas',
  paneTitle: 'Lecturas',
  summary: (files, wasted) => `${files} archivos  ${wasted} leídos 3+ veces`,
  empty: 'Ningún archivo leído aún. El panel se llena a medida que Claude lee archivos; 3 o más lecturas del mismo archivo se marcan.',
  wasted: 'contexto desperdiciado',
}

export const STRINGS = { en, pt, es }
