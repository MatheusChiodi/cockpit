import type { Register } from 'claude-code'

const RULES: readonly { pattern: RegExp; what: string }[] = [
  { pattern: /\b(vercel|netlify\s+deploy)\b[^|;&\n]*--prod\b/, what: 'deploy em produção' },
  { pattern: /\bfirebase\s+deploy\b/, what: 'firebase deploy' },
  { pattern: /\bterraform\s+(apply|destroy)\b/, what: 'terraform apply/destroy' },
  { pattern: /\bkubectl\s+(apply|delete|scale|rollout)\b/, what: 'alteração em cluster Kubernetes' },
  { pattern: /\beas\s+(submit|update)\b|\beas\s+build\b[^|;&\n]*production/, what: 'publicação via EAS' },
  { pattern: /\b(npm|pnpm|yarn)\s+publish\b/, what: 'publicação de pacote' },
  { pattern: /\bdocker\s+push\b/, what: 'docker push' },
  { pattern: /\bgh\s+release\s+create\b/, what: 'criação de release' },
  { pattern: /\b(prisma\s+migrate\s+deploy|flyway\s+migrate|liquibase\s+update)\b/, what: 'migração de banco' },
  { pattern: /\b(NODE_ENV|APP_ENV|ENV)=prod(uction)?\b/, what: 'comando com ambiente de produção' },
]

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

export const register: Register = on => {
  // Não bloqueia: obriga a confirmação do usuário, mesmo com o comando já liberado nas permissões.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const what = e.tool === 'Bash' || e.tool === 'PowerShell' ? RULES.find(rule => rule.pattern.test(commandOf(e.input)))?.what : undefined

    return what !== undefined && verdict.decision === 'allow'
      ? { decision: 'ask', reason: `prod-guard: ${what}. Confirme antes de rodar.` }
      : verdict
  }).catch(() => ({ decision: 'ask', reason: 'prod-guard: a verificação falhou, confirme manualmente.' }))
}
