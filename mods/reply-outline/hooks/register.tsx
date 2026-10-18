import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

const PANE = 'reply-outline'
const reply = atom({ plugin: 'reply-outline', key: 'reply' } as const, '')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MAX = 12

const unique = (items: string[], key = (item: string) => item): string[] => {
  const seen = new Set<string>()

  return items.filter(item => !seen.has(key(item)) && seen.add(key(item))).slice(0, MAX)
}

// What a long reply holds that is worth jumping to: headings, files and links, code blocks left out.
const outline = (text: string) => {
  const prose = text.replace(/^\s*```[\s\S]*?^\s*```/gm, '')
  const links = prose.match(/https?:\/\/[^\s)>\]]+/g) ?? []
  const bare = prose.replace(/https?:\/\/[^\s)>\]]+/g, '')
  const paths = bare.match(/(?:[\w.-]+\/)*[\w.-]+\.[A-Za-z]\w{0,5}(?::\d+)?(?![\w/])/g) ?? []

  return {
    headings: unique([...prose.matchAll(/^#{1,4}\s+(.+)$/gm)].map(match => (match[1] ?? '').trim())),
    files: unique(
      paths.filter(item => !/^\d/.test(item) && !item.includes('..')),
      item => item.replace(/:\d+$/, ''),
    ),
    links: unique(links),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'outline', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'outline' }, async $ => {
    const s = await strings($)
    await $.ui.open({ id: PANE, title: s.paneTitle })

    return { text: s.opened }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && e.answer !== '') {
      await update($, reply, () => e.answer.slice(0, 20000))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await strings($)
    const text = await read($, reply)
    const found = outline(text)
    const width = Math.max(12, e.props.bodyColumns - 4)
    const sections = [
      { label: s.headings, items: found.headings },
      { label: s.files, items: found.files },
      { label: s.links, items: found.links },
    ].filter(section => section.items.length > 0)

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(found.headings.length, found.files.length, found.links.length), e.props.bodyColumns)}
        {text === '' && <Text dimColor>{s.empty}</Text>}
        {text !== '' && sections.length === 0 && <Text dimColor>{s.nothing}</Text>}
        {sections.map(section => (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>{section.label}</Text>
            {section.items.map(item => (
              <Text wrap="truncate-end">
                {'  '}
                {item.slice(0, width)}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
