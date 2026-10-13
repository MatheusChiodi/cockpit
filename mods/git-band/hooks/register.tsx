import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

import type { GitInfo } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('git-band')

const info = atom({ plugin: 'git-band', key: 'info' } as const, null)

const MUTATING = new Set(['Bash', 'PowerShell', 'Edit', 'Write', 'NotebookEdit'])

const git = async ($: EngineInterface, args: readonly string[]): Promise<string | undefined> => {
  const ran = await $.process.run(['git', '--no-pager', ...args], { timeoutMs: 5000 }).catch(() => undefined)

  return ran === undefined || ran.exitCode !== 0 ? undefined : ran.stdout
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const status = await git($, ['status', '--porcelain=v1', '--branch'])

  if (status === undefined) {
    await update($, info, () => null)

    return
  }

  const [head = '', ...changes] = status.split('\n').filter(line => line !== '')
  const stat = (await git($, ['diff', '--shortstat', 'HEAD'])) ?? ''
  const [subject = '', age = ''] = ((await git($, ['log', '-1', '--format=%s%x09%cr'])) ?? '').trim().split('\t')
  const found: GitInfo = {
    branch: /^## (?:No commits yet on )?([^.\s]+)/.exec(head)?.[1] ?? '?',
    changed: changes.length,
    added: Number(/(\d+) insertion/.exec(stat)?.[1] ?? 0),
    removed: Number(/(\d+) deletion/.exec(stat)?.[1] ?? 0),
    ahead: Number(/ahead (\d+)/.exec(head)?.[1] ?? 0),
    behind: Number(/behind (\d+)/.exec(head)?.[1] ?? 0),
    subject: subject.slice(0, 48),
    age,
  }

  await update($, info, () => found)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    // Pega mudanças feitas fora do Claude (editor, outro terminal).
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (MUTATING.has(String(e.tool))) {
      void refresh($)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const found = await read($, info)

    if (e.props.hasSurvey || (await isOff($)) || found === null) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'git',
      'git',
      <Text wrap="truncate-end">
        <Text bold>{found.branch}</Text>
        {found.changed === 0 ? (
          <Text color="success">  ✓ limpo</Text>
        ) : (
          <Text>
            {'  '}±{found.changed} <Text color="success">+{found.added}</Text> <Text color="error">−{found.removed}</Text>
          </Text>
        )}
        {found.ahead > 0 && <Text color="warning">  ↑{found.ahead}</Text>}
        {found.behind > 0 && <Text color="warning">  ↓{found.behind}</Text>}
        {found.subject !== '' && (
          <Text dimColor>
            {'  '}
            {found.subject} · {found.age}
          </Text>
        )}
      </Text>,
      below,
    )
  })
}
