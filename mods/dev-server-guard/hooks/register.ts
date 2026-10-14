import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Project = { devScript: string; viteConfig: string }

// Read once per module load: the dev script and the Vite config say which port a dev server takes.
const cache: { project: Project | undefined } = { project: undefined }

const detect = async ($: EngineInterface): Promise<Project> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)
  let devScript = ''

  try {
    const scripts = (JSON.parse(typeof manifest === 'string' ? manifest : '{}') as { scripts?: Record<string, unknown> }).scripts
    devScript = typeof scripts?.dev === 'string' ? scripts.dev : ''
  } catch {
    // Invalid package.json: only the command itself is read.
  }

  let viteConfig = ''

  for (const file of ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

    if (typeof text === 'string') {
      viteConfig = text
      break
    }
  }

  return { devScript, viteConfig }
}

// A package manager's dev script, or the dev server of Next.js or Vite called directly.
const PM_DEV = /^(?:npm\s+run|pnpm(?:\s+run)?|yarn(?:\s+run)?|bun(?:\s+run)?)\s+dev\b/
const DIRECT = /^(?:npx\s+|pnpm\s+exec\s+|bunx\s+)?(next\s+dev|vite(?=\s+dev\b|\s+-|\s*$))/
const PORT_FLAG = /(?:--port[= ]|-p[= ]?|\bPORT=)(\d{2,5})\b/

// The port the command's dev server will take; undefined when the command starts none or the port is unknowable.
const portOf = (project: Project, command: string): number | undefined => {
  for (const part of command.split(/&&|\|\||;|\||\n/)) {
    const segment = part.trim().replace(/^(?:\w+=\S+\s+)*/, '')
    const isScript = PM_DEV.test(segment)
    const direct = DIRECT.exec(segment)

    if (!isScript && direct === null) {
      continue
    }

    const text = isScript ? `${part} ${project.devScript}` : part
    const flag = PORT_FLAG.exec(text)?.[1]

    if (flag !== undefined) {
      return Number(flag)
    }

    if (/\bnext\b/.test(text)) {
      return 3000
    }

    if (/\bvite\b/.test(text)) {
      return Number(/\bport:\s*(\d{2,5})/.exec(project.viteConfig)?.[1] ?? 5173)
    }
  }

  return undefined
}

const answers = async ($: EngineInterface, port: number): Promise<boolean> =>
  $.http
    .fetch(`http://localhost:${port}/`, { method: 'HEAD' })
    .then(() => true)
    .catch(() => false)

// The question to put to the person; undefined when the command is not a dev server or its port is free.
const question = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  cache.project ??= await detect($)
  const port = portOf(cache.project, command)

  return port !== undefined && (await answers($, port)) ? (await strings($)).running(port) : undefined
}

export const register: Register = on => {
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if ((e.tool !== 'Bash' && e.tool !== 'PowerShell') || verdict.decision !== 'allow') {
      return verdict
    }

    const input = e.input as { command?: unknown }
    const reason = typeof input.command === 'string' ? await question($, input.command) : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
