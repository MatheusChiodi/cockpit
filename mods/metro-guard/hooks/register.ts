import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Project = { native: boolean; scripts: Record<string, string> }

// Read once per module load: whether the project is Expo or React Native, and what its scripts start.
const cache: { project: Project | undefined } = { project: undefined }

const detect = async ($: EngineInterface): Promise<Project> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)
  const project: Project = { native: false, scripts: {} }

  try {
    const parsed = JSON.parse(typeof manifest === 'string' ? manifest : '{}') as {
      dependencies?: Record<string, unknown>
      devDependencies?: Record<string, unknown>
      scripts?: Record<string, unknown>
    }
    const deps = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
    project.native = deps.has('expo') || deps.has('react-native')

    for (const [name, script] of Object.entries(parsed.scripts ?? {})) {
      if (typeof script === 'string') {
        project.scripts[name] = script
      }
    }
  } catch {
    // Invalid package.json: no stack detected.
  }

  return project
}

// The bundler started directly, or through a package manager's start or dev script that starts it.
const METRO = /(?:^|\s)(?:expo\s+start|react-native\s+start|rnx?\s+start)\b/
const PM_SCRIPT = /^(?:npm\s+(?:run\s+)?|pnpm\s+(?:run\s+)?|yarn\s+(?:run\s+)?|bun\s+(?:run\s+)?)(start|dev)\b/
const PORT_FLAG = /(?:--port[= ]|-p[= ]?|\bRCT_METRO_PORT=)(\d{2,5})\b/

// The port Metro will take if the command starts it; undefined when the command starts no bundler.
const portOf = (project: Project, command: string): number | undefined => {
  for (const part of command.split(/&&|\|\||;|\||\n/)) {
    const segment = part.trim().replace(/^(?:\w+=\S+\s+)*/, '')
    const script = PM_SCRIPT.exec(segment)?.[1]
    const text = script !== undefined ? `${part} ${project.scripts[script] ?? ''}` : part

    if (METRO.test(segment) || (script !== undefined && METRO.test(project.scripts[script] ?? ''))) {
      return Number(PORT_FLAG.exec(text)?.[1] ?? 8081)
    }
  }

  return undefined
}

const answers = async ($: EngineInterface, port: number): Promise<boolean> =>
  $.http
    .fetch(`http://localhost:${port}/status`, { method: 'GET' })
    .then(() => true)
    .catch(() => false)

// The question to put to the person; undefined when the command starts no bundler or its port is free.
const question = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  cache.project ??= await detect($)

  if (!cache.project.native) {
    return undefined
  }

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
