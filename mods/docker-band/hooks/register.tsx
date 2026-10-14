import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { DockerInfo } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('docker-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const info = atom({ plugin: 'docker-band', key: 'info' } as const, null)

const COMPOSE = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'] as const

const docker = async ($: EngineInterface, root: string, args: readonly string[]) =>
  $.process.run(['docker', ...args], { cwd: root, timeoutMs: 5000 }).catch(() => undefined)

const lines = (text: string): string[] => text.split('\n').map(line => line.trim()).filter(line => line !== '')

const check = async ($: EngineInterface): Promise<DockerInfo | null> => {
  const root = await $.session.root()
  let hasCompose = false

  for (const file of COMPOSE) {
    hasCompose ||= await $.fs.exists(`${root}/${file}`)
  }

  if (!hasCompose && !(await $.fs.exists(`${root}/Dockerfile`))) {
    return null
  }

  const daemon = await docker($, root, ['info', '--format', '{{.ServerVersion}}'])

  // No docker command at all: nothing to watch.
  if (daemon === undefined) {
    return null
  }

  if (daemon.exitCode !== 0) {
    return { down: true, up: 0, total: 0, stopped: [] }
  }

  if (!hasCompose) {
    return null
  }

  const all = await docker($, root, ['compose', 'config', '--services'])
  const running = await docker($, root, ['compose', 'ps', '--services', '--status', 'running'])

  if (all === undefined || running === undefined || all.exitCode !== 0) {
    return null
  }

  const services = lines(all.stdout)
  const up = new Set(running.exitCode === 0 ? lines(running.stdout) : [])
  const stopped = services.filter(name => !up.has(name))

  return stopped.length === 0 ? null : { down: false, up: services.length - stopped.length, total: services.length, stopped }
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const found = await check($)

  await update($, info, held => (JSON.stringify(held) === JSON.stringify(found) ? held : found))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (/\bdocker\b|\bcompose\b/.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (/\bdocker\b|\bcompose\b/.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const found = await read($, info)

    if (e.props.hasSurvey || (await isOff($)) || found === null) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'project',
      s.label,
      <Text wrap="truncate-end">
        {found.down ? (
          <Text color="error">{s.daemonDown}</Text>
        ) : (
          <Text>
            <Text color="warning">{s.compose(found.up, found.total)}</Text>
            <Text dimColor>
              {'  '}
              {s.stopped}: {found.stopped.join('  ')}
            </Text>
          </Text>
        )}
      </Text>,
      below,
    )
  })
}
