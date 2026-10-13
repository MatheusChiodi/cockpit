// Gerado por scripts/build-manifests.mjs a partir de kit/kit.tsx. Não edite à mão.
import type { BoxProps, Color, ElementConstructor, RenderChildren, TextProps } from 'claude-code'

// A linguagem visual da Turbina: toda faixa é uma linha de instrumento com trilho colorido,
// rótulo de largura fixa e valores. Empilhadas, as faixas alinham como um painel só.

export type Ui = { Box: ElementConstructor<BoxProps>; Text: ElementConstructor<TextProps> }

export type Group = 'git' | 'sessao' | 'projeto' | 'dia'

export type Tone = 'success' | 'warning' | 'error'

// Cor do trilho por assunto. Verde, amarelo e vermelho ficam reservados para o estado dos valores.
const HUE: Record<Group, Color> = { git: 'merged', sessao: 'claude', projeto: 'suggestion', dia: 'remember' }

const LABEL_WIDTH = 10

// Recuo das linhas de continuação: alinha com a coluna de valores.
export const INDENT = ' '.repeat(LABEL_WIDTH + 2)

export const toneOf = (percent: number): Tone => (percent >= 85 ? 'error' : percent >= 60 ? 'warning' : 'success')

// Medidor de linha fina: trecho cheio em traço pesado, o resto em traço leve.
export const gauge = (percent: number, width: number): { fill: string; rest: string } => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)

  return { fill: '━'.repeat(filled), rest: '─'.repeat(width - filled) }
}

export const meter = (ui: Ui, percent: number, width: number, color: Color = toneOf(percent)) => {
  const { Text } = ui
  const { fill, rest } = gauge(percent, width)

  return (
    <Text>
      <Text color={color}>{fill}</Text>
      <Text dimColor>{rest}</Text>
    </Text>
  )
}

// Uma linha de instrumento. `below` é o que os outros mods já desenharam na faixa.
export const row = (ui: Ui, group: Group, label: string, body: unknown, below?: unknown) => {
  const { Box, Text } = ui

  return (
    <Box flexDirection="column">
      {below as RenderChildren}
      <Box>
        <Text color={HUE[group]}>▍ </Text>
        <Text dimColor>{label.toUpperCase().padEnd(LABEL_WIDTH)}</Text>
        {body as RenderChildren}
      </Box>
    </Box>
  )
}

// Cabeçalho de painel lateral: título em destaque, resumo e uma régua.
export const heading = (ui: Ui, group: Group, title: string, summary: string, columns: number) => {
  const { Box, Text } = ui

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={HUE[group]}>▍ </Text>
        <Text bold>{title.toUpperCase()}</Text>
        <Text dimColor>  {summary}</Text>
      </Text>
      <Text dimColor>{'─'.repeat(Math.max(8, Math.min(columns, 64)))}</Text>
    </Box>
  )
}
