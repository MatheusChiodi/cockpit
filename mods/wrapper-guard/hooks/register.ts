import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Wrappers = { mvn: boolean; gradle: boolean }

// Read once per module load: the wrappers a project ships do not change mid-session.
const cache: { wrappers: Wrappers | undefined } = { wrappers: undefined }

const has = async ($: EngineInterface, root: string, names: readonly string[]): Promise<boolean> => {
  for (const name of names) {
    if (await $.fs.exists(`${root}/${name}`)) {
      return true
    }
  }

  return false
}

const detect = async ($: EngineInterface): Promise<Wrappers> => {
  const root = await $.session.root()

  return { mvn: await has($, root, ['mvnw', 'mvnw.cmd']), gradle: await has($, root, ['gradlew', 'gradlew.bat']) }
}

const GLOBAL = /^(mvn|gradle)(?:\.cmd|\.bat)?$/i
const ENV_ASSIGNMENT = /^[A-Za-z_]\w*=/

// The global build tool a command line starts a segment with, when it asks for more than its version.
const globalTool = (command: string): 'mvn' | 'gradle' | undefined => {
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const tokens = segment.trim().split(/\s+/)
    const start = tokens.findIndex(token => !ENV_ASSIGNMENT.test(token) && token !== 'sudo')
    const head = GLOBAL.exec(tokens[start] ?? '')?.[1]?.toLowerCase()
    const args = tokens.slice(start + 1)

    if (head !== undefined && !(args.length > 0 && args.every(arg => /^(-v|-version|--version)$/.test(arg)))) {
      return head as 'mvn' | 'gradle'
    }
  }

  return undefined
}

const verdict = async ($: EngineInterface, command: string, shell: 'sh' | 'ps'): Promise<string | undefined> => {
  const tool = globalTool(command)

  if (tool === undefined) {
    return undefined
  }

  cache.wrappers ??= await detect($)

  if (!cache.wrappers[tool]) {
    return undefined
  }

  const s = await strings($)

  return s.blocked(tool, shell === 'ps' ? (tool === 'mvn' ? '.\\mvnw.cmd' : '.\\gradlew.bat') : tool === 'mvn' ? './mvnw' : './gradlew')
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await verdict($, e.command, 'sh')

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await verdict($, e.command, 'ps')

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
