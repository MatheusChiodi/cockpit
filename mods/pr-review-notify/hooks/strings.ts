const en = {
  title: 'Claude Code',
  changed: (number: number, decision: string) => `PR #${number}: ${decision}`,
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes requested',
  REVIEW_REQUIRED: 'review required',
  none: 'no decision',
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  changed: (number, decision) => `PR #${number}: ${decision}`,
  APPROVED: 'aprovado',
  CHANGES_REQUESTED: 'alterações solicitadas',
  REVIEW_REQUIRED: 'revisão necessária',
  none: 'sem decisão',
}

const es: Strings = {
  title: 'Claude Code',
  changed: (number, decision) => `PR #${number}: ${decision}`,
  APPROVED: 'aprobado',
  CHANGES_REQUESTED: 'cambios solicitados',
  REVIEW_REQUIRED: 'revisión requerida',
  none: 'sin decisión',
}

export const STRINGS = { en, pt, es }
