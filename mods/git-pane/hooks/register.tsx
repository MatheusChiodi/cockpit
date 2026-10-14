import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Change, Commit, Repo } from '../types'

const PANE = 'git-pane'
const repo = atom({ plugin: 'git-pane', key: 'repo' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TONE: Record<string, string> = { M: 'warning', A: 'success', D: 'error', R: 'warning', U: 'error' }

const age = (seconds: number): string => {
  const steps: [string, number][] = [['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]]
  const step = steps.find(([, size]) => seconds >= size)

  return step === undefined ? `${Math.max(0, Math.floor(seconds))}s` : `${Math.floor(seconds / step[1])}${step[0]}`
}

const git = async ($: EngineInterface, ...args: string[]): Promise<string | undefined> => {
  const ran = await $.process.run(['git', '--no-pager', ...args])

  return ran.exitCode === 0 ? ran.stdout : undefined
}

// "## main...origin/main [ahead 1, behind 2]" -> branch and counts
const parseHead = (line: string): Pick<Repo, 'branch' | 'ahead' | 'behind'> => {
  const text = line.replace(/^## /, '').replace(/^No commits yet on /, '')
  const branch = text.replace(/ \[.*\]$/, '').split('...')[0] ?? text

  return {
    branch,
    ahead: Number(/ahead (\d+)/.exec(text)?.[1] ?? 0),
    behind: Number(/behind (\d+)/.exec(text)?.[1] ?? 0),
  }
}

const parseChange = (line: string): Change => {
  const [x = ' ', y = ' '] = line
  const code = x !== ' ' && x !== '?' ? x : y !== ' ' ? y : '?'

  return { code, path: line.slice(3) }
}

const load = async ($: EngineInterface): Promise<void> => {
  const status = await git($, 'status', '--porcelain', '-b')

  if (status === undefined) {
    await update($, repo, () => ({ isRepo: false, branch: '', ahead: 0, behind: 0, files: [], commits: [] }))

    return
  }

  const [head = '', ...lines] = status.split('\n').filter(line => line.length > 0)
  const log = (await git($, 'log', '-8', '--pretty=format:%h%x09%ct%x09%s')) ?? ''
  const now = (await $.clock.now()) / 1000
  const commits: Commit[] = log
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => {
      const [hash = '', at = '0', ...subject] = line.split('\t')

      return { hash, subject: subject.join('\t'), age: age(now - Number(at)) }
    })

  await update($, repo, () => ({ isRepo: true, ...parseHead(head), files: lines.map(parseChange), commits }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'repo', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'repo' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: 'Repo' })

    return { text: (await strings($)).opened }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, repo)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 8)
    const width = Math.max(16, e.props.bodyColumns - 6)
    const files = held?.files ?? []
    const shown = Math.max(1, room - (held?.commits.length ?? 0))
    const summary = held?.isRepo === true ? s.summary(held.branch, held.ahead, held.behind, files.length) : ''

    return (
      <Box flexDirection="column">
        {heading(ui, 'git', s.title, summary, e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => load($)} />
        {held === null && <Text dimColor>{s.notLoaded}</Text>}
        {held !== null && !held.isRepo && <Text dimColor>{s.notRepo}</Text>}
        {held?.isRepo === true && files.length === 0 && <Text dimColor>{s.clean}</Text>}
        {files.slice(0, shown).map(file => (
          <Text wrap="truncate-end">
            <Text color={TONE[file.code] ?? 'inactive'} bold>
              {file.code}
            </Text>{' '}
            {file.path.slice(0, width)}
          </Text>
        ))}
        {held?.isRepo === true && <Text dimColor>{'\n'}{s.commits}</Text>}
        {held?.isRepo === true && held.commits.length === 0 && <Text dimColor>{s.noCommits}</Text>}
        {held?.commits.map(commit => (
          <Text wrap="truncate-end">
            <Text dimColor>{commit.hash}</Text> {commit.subject} <Text dimColor>{commit.age}</Text>
          </Text>
        ))}
      </Box>
    )
  })
}
