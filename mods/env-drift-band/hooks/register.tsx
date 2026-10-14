import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('env-drift-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const missing = atom({ plugin: 'env-drift-band', key: 'missing' } as const, [])

const EXAMPLES = ['.env.example', '.env.sample', '.env.template'] as const
const ENVS = ['.env', '.env.local', '.env.development', '.env.development.local'] as const

const SHOWN = 3

// Only the names: the line is cut at the first "=" and the value is never kept.
const keysOf = (text: string | undefined): string[] =>
  (text ?? '')
    .split('\n')
    .map(line => /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1])
    .filter((key): key is string => key !== undefined)

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  let example: string | undefined

  for (const file of EXAMPLES) {
    example ??= await $.fs.read(`${root}/${file}`).catch(() => undefined)
  }

  if (example === undefined) {
    await update($, missing, held => (held.length === 0 ? held : []))

    return
  }

  const have = new Set<string>()

  for (const file of ENVS) {
    for (const key of keysOf(await $.fs.read(`${root}/${file}`).catch(() => ''))) {
      have.add(key)
    }
  }

  const absent = [...new Set(keysOf(example))].filter(key => !have.has(key))

  await update($, missing, held => (held.join() === absent.join() ? held : absent))
}

const MUTATING = new Set(['Bash', 'PowerShell', 'Edit', 'Write'])

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(30000, () => void refresh($))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (MUTATING.has(String(e.tool))) {
      void refresh($)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const absent = await read($, missing)

    if (e.props.hasSurvey || (await isOff($)) || absent.length === 0) {
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
        <Text color="warning">{s.missing(absent.length)}</Text>
        <Text>
          {'  '}
          {absent.slice(0, SHOWN).join('  ')}
        </Text>
        {absent.length > SHOWN && <Text dimColor>  +{absent.length - SHOWN}</Text>}
      </Text>,
      below,
    )
  })
}
