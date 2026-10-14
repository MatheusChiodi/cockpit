import type { Register } from 'claude-code'

const SECTION = {
  id: 'security-rules:rules',
  text: "# Security rules\nValidate and normalize all external input at the boundary; reject, do not repair.\nUse parameterized queries; never build SQL, shell commands or paths by string concatenation.\nKeep secrets out of code, logs, errors and test fixtures; read them from the environment.\nGrant the least privilege a task needs. Escape output for its context (HTML, SQL, shell, URL).\nNever disable TLS or certificate verification, not even \"temporarily\".",
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
