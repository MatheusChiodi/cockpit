import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const PANE = 'tool-tally'
const counts = atom({ plugin: 'tool-tally', key: 'counts' } as const, {})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tally',
      description: 'Abre o painel com a contagem de chamadas por ferramenta',
    })

    return next(e)
  })

  on('command.run', { command: 'tally' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Ferramentas' })

    return { text: 'Painel de ferramentas aberto.' }
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    await update($, counts, held => ({ ...held, [tool]: (held[tool] ?? 0) + 1 }))

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const rows = Object.entries(await read($, counts)).sort((a, b) => b[1] - a[1])
    const total = rows.reduce((sum, [, count]) => sum + count, 0)
    const top = rows[0]?.[1] ?? 1
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 5)

    return (
      <Box flexDirection="column">
        <Text bold>{total} chamadas</Text>
        {rows.length === 0 && <Text dimColor>Nenhuma ferramenta usada ainda.</Text>}
        {rows.slice(0, room).map(([tool, count]) => (
          <Text>
            {String(count).padStart(4)} <Text color="claude">{'█'.repeat(Math.max(1, Math.round((count / top) * 12)))}</Text>{' '}
            {tool}
          </Text>
        ))}
      </Box>
    )
  })
}
