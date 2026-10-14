const en = {
  command: 'Open the pane with every Edit and Write of the session, lines added and removed',
  opened: 'Edits pane opened.',
  title: 'edits',
  paneTitle: 'Edits',
  summary: (count: number, added: number, removed: number) => `${count} edits  +${added} −${removed}`,
  empty: 'No edits yet. This pane fills up as Claude edits or writes files.',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Abre o painel com cada Edit e Write da sessão, com linhas adicionadas e removidas',
  opened: 'Painel de edições aberto.',
  title: 'edições',
  paneTitle: 'Edições',
  summary: (count, added, removed) => `${count} edições  +${added} −${removed}`,
  empty: 'Nenhuma edição ainda. O painel se preenche quando Claude edita ou escreve arquivos.',
}

const es: Strings = {
  command: 'Abre el panel con cada Edit y Write de la sesión, con líneas añadidas y eliminadas',
  opened: 'Panel de ediciones abierto.',
  title: 'ediciones',
  paneTitle: 'Ediciones',
  summary: (count, added, removed) => `${count} ediciones  +${added} −${removed}`,
  empty: 'Aún no hay ediciones. El panel se llena cuando Claude edita o escribe archivos.',
}

export const STRINGS = { en, pt, es }
