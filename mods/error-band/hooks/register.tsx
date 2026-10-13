import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Failure } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('error-band')

const failure = atom({ plugin: 'error-band', key: 'failure' } as const, null)

// A primeira linha que parece erro; senão, a última linha não vazia da saída.
const headline = (output: string): string => {
  const lines = output.split('\n').map(line => line.trim()).filter(line => line !== '')
  const found = lines.find(line => /error|erro|fail|exception|not found|denied|cannot|fatal/i.test(line))

  return (found ?? lines.at(-1) ?? 'sem saída').slice(0, 160)
}

const settle = async ($: EngineInterface, command: string, isError: boolean, output: string): Promise<void> => {
  const held: Failure | null = isError
    ? { command: command.replace(/\s+/g, ' ').slice(0, 60), line: headline(output) }
    : null

  // Um comando que passa limpa o erro anterior: a faixa mostra só o que ainda está quebrado.
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

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        <Box>
          <Text wrap="truncate-end">
            <Text color="error">✗ {held.command}</Text>
            <Text dimColor> → </Text>
            {held.line}{' '}
          </Text>
          <Button key="dismiss" label="Dispensar" onPress={() => update($, failure, () => null)} />
        </Box>
      </Box>
    )
  })
}
