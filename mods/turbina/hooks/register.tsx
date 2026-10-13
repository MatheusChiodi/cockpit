import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading, meter } from './kit'

import { PANELS } from './panels'

const PANE = 'turbina'

// Os painéis desligados. Cada mod de painel lê este valor e some quando o nome dele está aqui.
const off = atom({ plugin: 'turbina', key: 'off' } as const, [])

const names: readonly string[] = PANELS.map(panel => panel.name)

const apply = async ($: EngineInterface, next: readonly string[]): Promise<void> => {
  const list = names.filter(name => next.includes(name))
  await update($, off, () => list)
  await $.store.set('off', list)
}

const toggle = async ($: EngineInterface, name: string): Promise<void> => {
  const held = await read($, off)
  await apply($, held.includes(name) ? held.filter(one => one !== name) : [...held, name])
}

const restore = async ($: EngineInterface): Promise<void> => {
  const held = await $.store.get('off')
  const list = Array.isArray(held) ? held.filter((name): name is string => typeof name === 'string') : []
  await update($, off, () => list)
}

const summary = (disabled: readonly string[]): string =>
  `${names.length - disabled.length} de ${names.length} painéis ligados`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'turbina',
      description: 'Painel de configuração: liga e desliga os painéis da Turbina',
      argumentHint: '[on|off <painel|all>]',
    })
    await restore($)

    return next(e)
  })

  on('command.run', { command: 'turbina' }, async ($, e) => {
    const [action, target] = e.args.trim().toLowerCase().split(/\s+/)

    if (action !== 'on' && action !== 'off') {
      await $.ui.open({ id: PANE, title: 'Turbina', focus: true, closeOnEscape: true })

      return { text: `${summary(await read($, off))}. Enter ou clique alterna; Esc fecha.` }
    }

    const held = await read($, off)

    if (target === 'all') {
      await apply($, action === 'off' ? names : [])
    } else if (target !== undefined && names.includes(target)) {
      await apply($, action === 'off' ? [...held, target] : held.filter(one => one !== target))
    } else {
      return { text: `Painel desconhecido: ${target ?? '(vazio)'}. Use /turbina para ver a lista.` }
    }

    return { text: `${target} ${action === 'on' ? 'ligado' : 'desligado'}. ${summary(await read($, off))}.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const disabled = await read($, off)
    const width = Math.max(20, e.props.bodyColumns - 28)
    const active = names.length - disabled.length
    let group = ''

    return (
      <Box flexDirection="column">
        {heading(ui, 'sessao', 'turbina', `${active} de ${names.length} painéis ligados`, e.props.bodyColumns)}
        <Box gap={1}>
          {meter(ui, (active / names.length) * 100, 20, 'claude')}
          <Button key="all-on" label="Ligar todos" onPress={() => apply($, [])} />
          <Button key="all-off" label="Desligar todos" onPress={() => apply($, names)} />
        </Box>
        {PANELS.map(panel => {
          const isOn = !disabled.includes(panel.name)
          const title = panel.group === group ? null : (
            <Text dimColor bold>
              {'\n'}
              {panel.group.toUpperCase()}
            </Text>
          )
          group = panel.group

          return (
            <Box flexDirection="column">
              {title}
              <Button key={`panel:${panel.name}`} plain onPress={() => toggle($, panel.name)}>
                <Text color={isOn ? 'success' : 'inactive'}>{isOn ? '━━● ' : '●── '}</Text>
                <Text bold={isOn} dimColor={!isOn}>
                  {panel.name.padEnd(20)}
                </Text>{' '}
                <Text dimColor>{panel.description.slice(0, width)}</Text>
              </Button>
            </Box>
          )
        })}
      </Box>
    )
  })
}
