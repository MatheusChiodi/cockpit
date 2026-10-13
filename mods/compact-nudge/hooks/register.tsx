import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('compact-nudge')

const percent = atom({ plugin: 'compact-nudge', key: 'percent' } as const, 0)

const THRESHOLD = 75

const compact = async ($: EngineInterface): Promise<void> => {
  // Rejeita enquanto um turno roda: aí é só tentar de novo depois.
  const done = await $.session.compact({}).catch(() => undefined)

  $.ui.toast(done === undefined ? 'Não deu para compactar agora (turno em andamento?).' : 'Conversa compactada.')
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const now = e.context.percent ?? 0
    await update($, percent, held => (held === now ? held : now))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const used = await read($, percent)

    if (e.props.hasSurvey || (await isOff($)) || used < THRESHOLD) {
      return below
    }

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        <Box>
          <Text color={used >= 90 ? 'error' : 'warning'}>Contexto em {used}%. </Text>
          <Button key="compact" label="Compactar agora" onPress={() => compact($)} />
        </Box>
      </Box>
    )
  })
}
