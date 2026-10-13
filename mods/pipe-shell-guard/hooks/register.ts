import type { Register } from 'claude-code'

const RULES: readonly { pattern: RegExp; why: string }[] = [
  {
    pattern: /\b(curl|wget)\b[^|;&\n]*\|\s*(sudo\s+)?(ba|z|da|fi)?sh\b/,
    why: 'baixar um script e executar direto no shell',
  },
  { pattern: /\b(curl|wget)\b[^|;&\n]*\|\s*(sudo\s+)?(python3?|node|perl|ruby)\b/, why: 'baixar código e executar direto' },
  { pattern: /\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^|;\n]*\|\s*(iex|Invoke-Expression)\b/i, why: 'baixar um script e executar com Invoke-Expression' },
  { pattern: /\b(iex|Invoke-Expression)\b[^;\n]*\bDownloadString\b/i, why: 'executar script baixado com DownloadString' },
  { pattern: /\b(ba|z)?sh\s+<\(\s*(curl|wget)\b/, why: 'executar script baixado via substituição de processo' },
]

const verdict = (command: string): string | undefined => RULES.find(rule => rule.pattern.test(command))?.why

const refusal = (why: string): string =>
  `pipe-shell-guard bloqueou o comando: ${why}. Baixe o arquivo, leia e só então execute.`

const FAILED = 'pipe-shell-guard: a verificação falhou, comando recusado.'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const why = verdict(e.command)

    return why === undefined ? next(e) : { deny: refusal(why) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => {
    const why = verdict(e.command)

    return why === undefined ? next(e) : { deny: refusal(why) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: FAILED }))
}
