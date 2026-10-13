import type { Register } from 'claude-code'

const MAX_BYTES = 512 * 1024

export const register: Register = on => {
  // Ler um arquivo enorme inteiro queima contexto: sem `limit`, pede um recorte.
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    if (e.limit !== undefined || e.pages !== undefined) {
      return next(e)
    }

    const stat = await $.fs.stat(e.file_path).catch(() => undefined)

    return stat !== undefined && stat.kind === 'file' && stat.size > MAX_BYTES && !/\.(png|jpe?g|gif|webp|pdf)$/i.test(e.file_path)
      ? {
          deny: `big-read-guard: ${e.file_path} tem ${Math.round(stat.size / 1024)} KB. Leia um trecho com offset/limit ou procure com Grep.`,
        }
      : next(e)
  })
}
