import type { Register } from 'claude-code'

const MIN_LINES = 6

const CODE = [
  /^\s{2,}\S/,
  /^\t/,
  /[{}();,]\s*$/,
  /=>|::|->|&&|\|\|/,
  /^\s*(import|export|const|let|var|def|class|function|return|from|#include|using|package|public|private|\$)\b/,
  /^\s*[\w.]*(Error|Exception)\b/,
  /^\s*(at\s+\S+.*\(|File ".*", line \d+|Traceback|Caused by:)/,
  /^\s*\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/,
  /^\s*\[?(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\]?\b/,
  /^\s*[\w.-]+\s*[:=]\s*\S+\s*$/,
]

const looksLikeCode = (line: string) => line.trim() !== '' && CODE.some(pattern => pattern.test(line))

const fence = (text: string): string => {
  const lines = text.split('\n')
  const out: string[] = []
  let at = 0

  while (at < lines.length) {
    let end = at

    while (end < lines.length && looksLikeCode(lines[end] as string)) {
      end += 1
    }

    if (end - at >= MIN_LINES) {
      out.push('```', ...lines.slice(at, end), '```')
      at = end
    } else {
      out.push(lines[at] as string)
      at += 1
    }
  }

  return out.join('\n')
}

export const register: Register = on => {
  on('prompt.submit', async (_$, e, next) => {
    // An existing fence means the person already formatted it: leave the prompt alone.
    if (e.origin.kind !== 'composer' || e.text.startsWith('/') || e.text.includes('```')) {
      return next(e)
    }

    return next({ ...e, text: fence(e.text) })
  })
}

