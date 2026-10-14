const en = {
  label: 'pr',
  approved: '✓ approved',
  changes: '✗ changes requested',
  waiting: '… awaiting review',
  merged: '⇄ merged',
  closed: 'closed',
  draft: 'draft',
  open: 'open',
}

type Strings = typeof en

const pt: Strings = {
  label: 'pr',
  approved: '✓ aprovado',
  changes: '✗ mudanças pedidas',
  waiting: '… aguardando review',
  merged: '⇄ mergeado',
  closed: 'fechado',
  draft: 'rascunho',
  open: 'aberto',
}

const es: Strings = {
  label: 'pr',
  approved: '✓ aprobado',
  changes: '✗ cambios solicitados',
  waiting: '… esperando revisión',
  merged: '⇄ fusionado',
  closed: 'cerrado',
  draft: 'borrador',
  open: 'abierto',
}

export const STRINGS = { en, pt, es }
