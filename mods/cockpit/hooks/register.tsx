import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading, meter } from './kit'
import { GROUPS, PANELS } from './panels'
import { STRINGS } from './strings'

import type { Lang } from '../types'

const PANE = 'cockpit'

// The panels switched off. Each panel mod reads this value and hides while its name is here.
const off = atom({ plugin: 'cockpit', key: 'off' } as const, [])

// The language every Cockpit mod speaks. A mod reads it; English when the hub is not installed.
const lang = atom({ plugin: 'cockpit', key: 'lang' } as const, 'en')

const LANGS: readonly Lang[] = ['en', 'pt', 'es']

const names: readonly string[] = PANELS.map(panel => panel.name)

const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang)

const strings = async ($: EngineInterface) => STRINGS[await read($, lang)]

const apply = async ($: EngineInterface, next: readonly string[]): Promise<void> => {
  const list = names.filter(name => next.includes(name))
  await update($, off, () => list)
  await $.store.set('off', list)
}

const toggle = async ($: EngineInterface, name: string): Promise<void> => {
  const held = await read($, off)
  await apply($, held.includes(name) ? held.filter(one => one !== name) : [...held, name])
}

const speak = async ($: EngineInterface, next: Lang): Promise<void> => {
  await update($, lang, () => next)
  await $.store.set('lang', next)
}

// Both choices outlive the session: the store keeps them, the state serves them.
const restore = async ($: EngineInterface): Promise<void> => {
  const heldOff = await $.store.get('off')
  const heldLang = await $.store.get('lang')
  const list = Array.isArray(heldOff) ? heldOff.filter((name): name is string => typeof name === 'string') : []
  const spoken: Lang = isLang(heldLang) ? heldLang : 'en'
  await update($, off, () => list)
  await update($, lang, () => spoken)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await restore($)
    const s = await strings($)
    await $.command.register({ name: 'cockpit', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'cockpit' }, async ($, e) => {
    const [action, target] = e.args.trim().toLowerCase().split(/\s+/)

    if (action === 'lang') {
      if (!isLang(target)) {
        return { text: (await strings($)).unknownLanguage(target ?? '') }
      }

      await speak($, target)

      return { text: (await strings($)).languageSet }
    }

    const s = await strings($)
    const summary = async () => s.summary(names.length - (await read($, off)).length, names.length)

    if (action !== 'on' && action !== 'off') {
      await $.ui.open({ id: PANE, title: 'Cockpit', focus: true, closeOnEscape: true })

      return { text: s.opened(await summary()) }
    }

    const held = await read($, off)

    if (target === 'all') {
      await apply($, action === 'off' ? names : [])
    } else if (target !== undefined && names.includes(target)) {
      await apply($, action === 'off' ? [...held, target] : held.filter(one => one !== target))
    } else {
      return { text: s.unknownPanel(target ?? '') }
    }

    return { text: s.switched(target, action === 'on', await summary()) }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const disabled = await read($, off)
    const spoken = await read($, lang)
    const s = STRINGS[spoken]
    const width = Math.max(20, e.props.bodyColumns - 28)
    const active = names.length - disabled.length
    let group = ''

    return (
      <Box flexDirection="column">
        {heading(ui, 'session', s.title, s.summary(active, names.length), e.props.bodyColumns)}
        <Box gap={1}>
          {meter(ui, (active / names.length) * 100, 20, 'claude')}
          <Button key="all-on" label={s.allOn} onPress={() => apply($, [])} />
          <Button key="all-off" label={s.allOff} onPress={() => apply($, names)} />
        </Box>
        <Box gap={1}>
          <Text dimColor>{s.language}</Text>
          {LANGS.map(one => (
            <Button
              key={`lang:${one}`}
              label={one.toUpperCase()}
              variant={one === spoken ? 'primary' : 'secondary'}
              onPress={() => speak($, one)}
            />
          ))}
        </Box>
        {PANELS.map(panel => {
          const isOn = !disabled.includes(panel.name)
          const title =
            panel.group === group ? null : (
              <Text dimColor bold>
                {'\n'}
                {(GROUPS[panel.group]?.[spoken] ?? panel.group).toUpperCase()}
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
                <Text dimColor>{panel.description[spoken].slice(0, width)}</Text>
              </Button>
            </Box>
          )
        })}
      </Box>
    )
  })
}
