import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const DEFAULT_HOSTS = new Set([
  'registry.npmjs.org',
  'registry.yarnpkg.com',
  'pypi.org',
  'files.pythonhosted.org',
  'pypi.python.org',
])

// Each pattern captures the URL (or path) a command points the package source at.
const SOURCES: readonly RegExp[] = [
  /--(?:registry|index-url|extra-index-url|default-index|index)(?:=|\s+)['"]?([^\s'"]+)/gi,
  /\bpip3?\b[^|;&\n]*\s-i\s*['"]?([^\s'"]+)/gi,
  /\b(?:npm|pnpm|yarn)\s+(?:config\s+)?set\s+(?:-\S+\s+)*(?:@[\w.-]+:)?(?:registry|npmRegistryServer)(?:=|\s+)['"]?([^\s'"]+)/gi,
  /\bpip3?\s+config\s+set\s+[\w.-]*index-url(?:=|\s+)['"]?([^\s'"]+)/gi,
  /(?:PIP_INDEX_URL|PIP_EXTRA_INDEX_URL|NPM_CONFIG_REGISTRY)["']?\s*=\s*["']?([^\s"']+)/gi,
]

const hostOf = (url: string): string =>
  (/^(?:[a-z][\w+.-]*:\/\/)?(?:[^@/\s]*@)?([^/:\s]+)/i.exec(url)?.[1] ?? url).toLowerCase()

// The first host a command points packages at that is not a default registry.
const foreignHost = (command: string): string | undefined => {
  for (const source of SOURCES) {
    for (const match of command.matchAll(source)) {
      const host = hostOf(match[1] ?? '')

      if (!DEFAULT_HOSTS.has(host)) {
        return host
      }
    }
  }

  return undefined
}

const commandOf = (input: unknown): string =>
  typeof input === 'object' && input !== null && typeof (input as { command?: unknown }).command === 'string'
    ? (input as { command: string }).command
    : ''

export const register: Register = on => {
  // Does not block: asks the person, even when the command is already allowed in the permissions.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if (verdict.decision !== 'allow' || (e.tool !== 'Bash' && e.tool !== 'PowerShell')) {
      return verdict
    }

    const host = foreignHost(commandOf(e.input))

    return host === undefined ? verdict : { decision: 'ask', reason: (await strings($)).ask(host) }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
