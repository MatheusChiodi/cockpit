import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

const PANE = 'prompt-history'
const prompts = atom({ plugin: 'prompt-history', key: 'prompts' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const reuse = async ($: EngineInterface, text: string): Promise<void> => {
  await $.prompt.fill({ text, mode: 'replace' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'prompts', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'prompts' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('prompt.submit', async ($, e, next) => {
    const text = e.text.trim()

    if (text !== '' && !text.startsWith('/')) {
      await update($, prompts, list => [...list.filter(held => held !== text), text].slice(-100))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const list = await read($, prompts)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const width = Math.max(12, e.props.bodyColumns - 4)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .slice(-room)
          .reverse()
          .map((text, index) => (
            <Button key={`prompt:${index}`} plain onPress={() => reuse($, text)}>
              <Text dimColor>▸ </Text>
              <Text wrap="truncate-end">{text.replace(/\s+/g, ' ').slice(0, width)}</Text>
            </Button>
          ))}
      </Box>
    )
  })
}
