import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('session-diff-band')

const diff = atom({ plugin: 'session-diff-band', key: 'diff' } as const, { added: 0, removed: 0, edits: 0 })

const lines = (text: string): number => (text === '' ? 0 : text.split('\n').length)

const count = ($: EngineInterface, added: number, removed: number) =>
  update($, diff, held => ({ added: held.added + added, removed: held.removed + removed, edits: held.edits + 1 }))

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await count($, lines(e.new_string), lines(e.old_string))
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await count($, lines(e.content), 0)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const total = await read($, diff)

    if (e.props.hasSurvey || (await isOff($)) || total.edits === 0) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        <Text>
          <Text dimColor>Claude escreveu </Text>
          <Text color="success">+{total.added}</Text> <Text color="error">−{total.removed}</Text>
          <Text dimColor>
            {' '}
            linhas em {total.edits} edi{total.edits === 1 ? 'ção' : 'ções'}
          </Text>
        </Text>
      </Box>
    )
  })
}
