import type { Register } from 'claude-code'

// Instalar um pacote NOVO (com nome). `npm install` / `npm ci` sem argumentos passam direto.
const ADDS_PACKAGE: readonly RegExp[] = [
  /\bnpm\s+(install|i|add)\s+(?:-{1,2}[\w-]+\s+)*(?!-)[@\w]/,
  /\b(pnpm|yarn|bun)\s+add\s+\S/,
  /\bpip3?\s+install\s+(?:-{1,2}[\w-]+\s+)*(?!-r\b|-e\b|\.)[\w]/,
  /\b(cargo\s+add|go\s+get|gem\s+install|composer\s+require|dotnet\s+add\s+package)\s+\S/,
  /\bnpx\s+(?:-{1,2}[\w-]+\s+)*expo\s+install\s+\S/,
]

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

export const register: Register = on => {
  // Dependência nova é decisão sua: o Claude sempre pergunta antes de instalar.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const isInstall = (e.tool === 'Bash' || e.tool === 'PowerShell') && ADDS_PACKAGE.some(pattern => pattern.test(commandOf(e.input)))

    return isInstall && verdict.decision === 'allow'
      ? { decision: 'ask', reason: 'install-ask: o comando adiciona uma dependência nova. Confirme.' }
      : verdict
  }).catch(() => ({ decision: 'ask', reason: 'install-ask: a verificação falhou, confirme manualmente.' }))
}
