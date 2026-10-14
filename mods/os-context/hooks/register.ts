import type { EngineInterface, Register } from 'claude-code'

// Found once per module load: the section is the same for every prompt.
const CACHE: { text?: Promise<string> } = {}

const VERSION = /(\d+\.\d+(?:\.\d+)?)/

const run = async ($: EngineInterface, argv: string[]): Promise<string | undefined> => {
  const ran = await $.process.run(argv, { timeoutMs: 5000 }).catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return undefined
  }

  return `${ran.stdout}\n${ran.stderr}`
}

const version = async ($: EngineInterface, argv: string[]): Promise<string | undefined> =>
  (await run($, argv))?.match(VERSION)?.[1]

const python = async ($: EngineInterface) =>
  (await version($, ['python', '--version'])) ?? (await version($, ['python3', '--version']))

const system = async ($: EngineInterface): Promise<string> => {
  if ((await $.env.get('OS')) === 'Windows_NT') {
    return 'Windows'
  }

  const name = (await run($, ['uname', '-s']))?.trim()

  return name === 'Darwin' ? 'macOS' : name === undefined || name === '' ? 'unknown' : name
}

const shell = async ($: EngineInterface): Promise<string | undefined> => {
  const path = (await $.env.get('SHELL')) ?? (await $.env.get('ComSpec'))

  return path?.split(/[\\/]/).pop()
}

const detect = async ($: EngineInterface): Promise<string> => {
  const [os, sh, node, py, java, git] = await Promise.all([
    system($),
    shell($),
    version($, ['node', '--version']),
    python($),
    version($, ['java', '-version']),
    version($, ['git', '--version']),
  ])
  const tools = [
    ['node', node],
    ['python', py],
    ['java', java],
    ['git', git],
  ].flatMap(([tool, found]) => (found === undefined ? [] : [`${tool} ${found}`]))

  return [
    '# Environment',
    `OS: ${os}`,
    ...(sh === undefined ? [] : [`Shell: ${sh}`]),
    ...(tools.length === 0 ? [] : [`Installed: ${tools.join(', ')}`]),
    'Write commands for this OS and shell.',
  ].join('\n')
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    CACHE.text ??= detect($)

    return { sections: [...composed.sections, { id: 'os-context:env', text: await CACHE.text, scope: 'session' }] }
  })
}
