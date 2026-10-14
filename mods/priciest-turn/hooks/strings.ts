const en = {
  command: 'Shows the most expensive turn of this session and what it did',
  none: 'No cost recorded yet this session.',
  head: (n: number, usd: string, share: number) => `Priciest turn: #${n}  US$ ${usd}  (${share}% of the session)`,
  asked: (text: string) => `Asked: ${text}`,
  noPrompt: 'Asked: (no typed prompt)',
  tools: (list: string) => `Tools: ${list}`,
  noTools: 'Tools: none',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Mostra o turno mais caro desta sessão e o que ele fez',
  none: 'Nenhum custo registrado ainda nesta sessão.',
  head: (n, usd, share) => `Turno mais caro: #${n}  US$ ${usd}  (${share}% da sessão)`,
  asked: text => `Pedido: ${text}`,
  noPrompt: 'Pedido: (sem prompt digitado)',
  tools: list => `Ferramentas: ${list}`,
  noTools: 'Ferramentas: nenhuma',
}

const es: Strings = {
  command: 'Muestra el turno más caro de esta sesión y lo que hizo',
  none: 'Aún no hay costo registrado en esta sesión.',
  head: (n, usd, share) => `Turno más caro: #${n}  US$ ${usd}  (${share}% de la sesión)`,
  asked: text => `Pedido: ${text}`,
  noPrompt: 'Pedido: (sin prompt escrito)',
  tools: list => `Herramientas: ${list}`,
  noTools: 'Herramientas: ninguna',
}

export const STRINGS = { en, pt, es }
