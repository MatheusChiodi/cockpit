import type { Register } from 'claude-code'

// Alvos que nunca devem ser apagados recursivamente: raiz, home, cwd inteiro, raiz de drive.
const ROOTISH =
  /^(?:\/|\/\*|~|~\/|~\/\*|\$HOME\/?\*?|\$\{HOME\}\/?\*?|\*|\.|\.\/|\.\/\*|\.\.|\.\.\/|\.\.\/\*|[a-z]:[\\/]?\*?|\$env:USERPROFILE[\\/]?\*?|\$env:SystemDrive[\\/]?\*?|\$env:HOMEDRIVE[\\/]?\*?|\\)$/i

const REMOVERS = new Set(['rm', 'remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir'])

const ALWAYS: readonly { pattern: RegExp; why: string }[] = [
  { pattern: /\bmkfs(\.\w+)?\b/, why: 'formatar um sistema de arquivos (mkfs)' },
  { pattern: /\bdd\b[^|;&]*\bof=\/dev\/(sd|nvme|disk|hd|mmcblk)/, why: 'gravar direto em um disco (dd)' },
  { pattern: />\s*\/dev\/(sd|nvme|disk|hd|mmcblk)/, why: 'redirecionar saída para um disco' },
  { pattern: /\bformat(\.com)?\s+[a-z]:/i, why: 'formatar um drive' },
  { pattern: /\b(Format-Volume|Clear-Disk|Initialize-Disk)\b/i, why: 'formatar ou limpar um disco' },
  { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, why: 'fork bomb' },
  { pattern: /\bchmod\s+(-[a-zA-Z]*R[a-zA-Z]*\s+)+(777|a\+rwx)\s+\/(\s|$)/, why: 'chmod -R 777 na raiz' },
]

const unquote = (token: string): string => token.replace(/^['"]|['"]$/g, '')

const isRecursive = (flag: string): boolean =>
  /^-[a-z]*r[a-z]*$/i.test(flag) ||
  /^--recursive$/.test(flag) ||
  /^-rec(u(r(se?)?)?)?$/i.test(flag) ||
  /^\/s$/i.test(flag)

const removal = (segment: string): string | undefined => {
  const tokens = segment.trim().split(/\s+/).map(unquote)
  const start = tokens[0] === 'sudo' ? 1 : 0
  const head = tokens[start]?.toLowerCase()

  if (head === undefined || !REMOVERS.has(head)) {
    return undefined
  }

  const rest = tokens.slice(start + 1)
  const target = rest.find(token => ROOTISH.test(token))

  return target !== undefined && rest.some(isRecursive)
    ? `apagar recursivamente "${target}"`
    : undefined
}

const verdict =(command: string): string | undefined => {
  const always = ALWAYS.find(rule => rule.pattern.test(command))?.why

  if (always !== undefined) {
    return always
  }

  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const why = removal(segment)

    if (why !== undefined) {
      return why
    }
  }

  return undefined
}

const refusal = (why: string): string =>
  `rm-guard bloqueou o comando: ${why}. Se for mesmo intencional, peça ao usuário para rodar manualmente.`

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const why = verdict(e.command)

    return why === undefined ? next(e) : { deny: refusal(why) }
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'rm-guard: a verificação falhou, comando recusado.' },
  )

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => {
    const why = verdict(e.command)

    return why === undefined ? next(e) : { deny: refusal(why) }
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'rm-guard: a verificação falhou, comando recusado.' },
  )
}
