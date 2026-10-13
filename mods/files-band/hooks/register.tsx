import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('files-band')

const files = atom({ plugin: 'files-band', key: 'files' } as const, [])

const base = (path: string): string => path.split(/[\\/]/).at(-1) ?? path

// O mais recente primeiro, sem repetir.
const touch = ($: EngineInterface, path: string) =>
  update($, files, list => [path, ...list.filter(held => held !== path)].slice(0, 200))

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await touch($, e.file_path)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await touch($, e.file_path)
    }

    return ran
  })

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      await touch($, e.notebook_path)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, files)

    if (e.props.hasSurvey || (await isOff($)) || list.length === 0) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)
    const shown = list.slice(0, 4).map(base)

    return (
      <Box flexDirection="column">
        {below}
        <Text wrap="truncate-end">
          <Text color="warning">✎ {list.length}</Text>
          <Text dimColor> alterado{list.length === 1 ? '' : 's'} na sessão: </Text>
          {shown.join(', ')}
          {list.length > shown.length && <Text dimColor> +{list.length - shown.length}</Text>}
        </Text>
      </Box>
    )
  })
}
