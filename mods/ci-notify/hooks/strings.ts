const en = {
  title: 'Claude Code',
  passed: (workflow: string) => `CI passed: ${workflow}`,
  failed: (workflow: string, conclusion: string) => `CI failed: ${workflow} (${conclusion})`,
  workflow: 'workflow',
  unknown: 'unknown',
}

type Strings = typeof en

const pt: Strings = {
  title: 'Claude Code',
  passed: workflow => `CI passou: ${workflow}`,
  failed: (workflow, conclusion) => `CI falhou: ${workflow} (${conclusion})`,
  workflow: 'workflow',
  unknown: 'desconhecido',
}

const es: Strings = {
  title: 'Claude Code',
  passed: workflow => `CI pasó: ${workflow}`,
  failed: (workflow, conclusion) => `CI falló: ${workflow} (${conclusion})`,
  workflow: 'workflow',
  unknown: 'desconocido',
}

export const STRINGS = { en, pt, es }
