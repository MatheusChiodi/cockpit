const en = {
  label: 'explore',
  reads: (count: number) => (count === 1 ? '1 read' : `${count} reads`),
  edits: (count: number) => (count === 1 ? '1 edit' : `${count} edits`),
  exploring: 'exploring',
  mixed: 'mixed',
  changing: 'changing',
}

type Strings = typeof en

const pt: Strings = {
  label: 'explorar',
  reads: count => (count === 1 ? '1 leitura' : `${count} leituras`),
  edits: count => (count === 1 ? '1 edição' : `${count} edições`),
  exploring: 'explorando',
  mixed: 'misto',
  changing: 'alterando',
}

const es: Strings = {
  label: 'explorar',
  reads: count => (count === 1 ? '1 lectura' : `${count} lecturas`),
  edits: count => (count === 1 ? '1 edición' : `${count} ediciones`),
  exploring: 'explorando',
  mixed: 'mixto',
  changing: 'cambiando',
}

export const STRINGS = { en, pt, es }
