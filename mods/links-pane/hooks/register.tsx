import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, UiPressArgument } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

const PANE = 'links-pane'
const links = atom({ plugin: 'links-pane', key: 'links' } as const, [])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const URL = /https?:\/\/[^\s<>"'`\])]+/g

const found = (answer: string): string[] =>
  (answer.match(URL) ?? []).map(url => url.replace(/[.,;:!?]+$/, '')).filter(url => url.length > 8)

const collect = ($: EngineInterface, urls: string[]) =>
  update($, links, list => {
    const fresh = urls.filter((url, index) => urls.indexOf(url) === index)

    return [...list.filter(held => !fresh.includes(held)), ...fresh].slice(-100)
  })

const copy = async ($: EngineInterface, press: UiPressArgument, url: string): Promise<void> => {
  await $.ui.copy({ text: url, surface: press.surface })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'links', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'links' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('turn.complete', async ($, e, next) => {
    const urls = e.agentId === undefined ? found(e.answer) : []

    if (urls.length > 0) {
      await collect($, urls)
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const list = await read($, links)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const width = Math.max(12, e.props.bodyColumns - 4)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(list.length), e.props.bodyColumns)}
        {list.length === 0 && <Text dimColor>{s.empty}</Text>}
        {list
          .slice(-room)
          .reverse()
          .map(url => (
            <Button key={`link:${url}`} plain onPress={press => copy($, press, url)}>
              <Text dimColor>▸ </Text>
              <Text color="claude" wrap="truncate-end">
                {url.slice(0, width)}
              </Text>
            </Button>
          ))}
      </Box>
    )
  })
}
