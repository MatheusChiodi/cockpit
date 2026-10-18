import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Split } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('hands-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const split = atom({ plugin: 'hands-band', key: 'split' } as const, null)

// The files Claude wrote in this session, with forward slashes.
const claudeFiles: { paths: Set<string> } = { paths: new Set() }

const slashed = (path: string): string => path.replace(/\\/g, '/')

// "XY path", "XY old -> new" and quoted paths of `git status --porcelain=v1`.
const pathOf = (line: string): string =>
  slashed(line.slice(3).split(' -> ').pop() ?? '').replace(/^"|"$/g, '')

const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['git', '--no-pager', 'status', '--porcelain=v1'], { timeoutMs: 5000 })
    .catch(() => undefined)

  const dirty = ran === undefined || ran.exitCode !== 0 ? undefined : ran.stdout.split('\n').filter(line => line.length > 3)
  let found: Split | null = null

  if (dirty !== undefined && dirty.length > 0) {
    const mine = dirty.filter(line => {
      const path = pathOf(line)

      return [...claudeFiles.paths].some(edited => edited === path || edited.endsWith(`/${path}`))
    })
    found = { claude: mine.length, you: dirty.length - mine.length }
  }

  const held = await read($, split)

  if (held?.claude !== found?.claude || held?.you !== found?.you) {
    await update($, split, () => found)
  }
}

const wrote = async ($: EngineInterface, path: string): Promise<void> => {
  claudeFiles.paths.add(slashed(path))
  await refresh($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    claudeFiles.paths.clear()
    await refresh($)
    // Catches the changes made outside Claude (the editor, another terminal).
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await wrote($, e.file_path)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await wrote($, e.file_path)
    }

    return ran
  })

  // A commit, a stash or a checkout changes what is waiting.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    void refresh($)

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const found = await read($, split)

    if (e.props.hasSurvey || (await isOff($)) || found === null) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'session',
      s.label,
      <Text wrap="truncate-end">
        <Text bold>{s.claude(found.claude)}</Text>
        <Text bold>  {s.you(found.you)}</Text>
        <Text dimColor>  {s.tail}</Text>
      </Text>,
      below,
    )
  })
}
