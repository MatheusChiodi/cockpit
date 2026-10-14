import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Failure } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('error-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const failure = atom({ plugin: 'error-band', key: 'failure' } as const, null)

// The first line that looks like an error; otherwise the last non-empty line of the output.
const headline = (output: string, empty: string): string => {
  const lines = output.split('\n').map(line => line.trim()).filter(line => line !== '')
  const found = lines.find(line => /error|erro|fail|exception|not found|denied|cannot|fatal/i.test(line))

  return (found ?? lines.at(-1) ?? empty).slice(0, 160)
}

const settle = async ($: EngineInterface, command: string, isError: boolean, output: string): Promise<void> => {
  const s = await strings($)
  const held: Failure | null = isError
    ? { command: command.replace(/\s+/g, ' ').slice(0, 60), line: headline(output, s.noOutput) }
    : null

  // A command that passes clears the previous error: the band shows only what is still broken.
  await update($, failure, () => held)
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined) {
      await settle($, e.command, ran.isError === true, ran.text ?? '')
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined) {
      await settle($, e.command, ran.isError === true, ran.text ?? '')
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const held = await read($, failure)

    if (e.props.hasSurvey || (await isOff($)) || held === null) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Button, Text } = ui
    const s = await strings($)

    return row(
      ui,
      'session',
      s.label,
      [
        <Text wrap="truncate-end">
          <Text color="error" bold>
            ✗ {held.command}
          </Text>
          <Text dimColor>  {held.line}  </Text>
        </Text>,
        <Button key="dismiss" label={s.dismiss} onPress={() => update($, failure, () => null)} />,
      ],
      below,
    )
  })
}
