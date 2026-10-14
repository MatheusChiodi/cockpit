import type { Register } from 'claude-code'

// JS ("at fn (file:1:2)"), Python, Java and .NET shapes.
const TRACE = [
  /^\s+at .+:\d+(:\d+)?\)?\s*$/m,
  /Traceback \(most recent call last\)/,
  /^\s+File ".+", line \d+/m,
  /^\s+at [\w$.]+\([\w$]+\.java:\d+\)/m,
  /^\s+at [\w.<>]+\(.*\) in .+:line \d+/m,
]

const CONTEXT = [
  'The prompt contains a stack trace.',
  '1. Find the first frame inside this project (skip node_modules, site-packages, JDK, framework and runtime frames).',
  '2. Read that code, and the caller if needed, before proposing any fix.',
  '3. State the root cause in one line, then fix that cause, not the symptom.',
].join('\n')

export const register: Register = on => {
  on('prompt.submit', (_$, e, next) =>
    e.origin.kind === 'composer' && TRACE.some(pattern => pattern.test(e.text))
      ? next({ ...e, context: [...(e.context ?? []), CONTEXT] })
      : next(e),
  )
}
