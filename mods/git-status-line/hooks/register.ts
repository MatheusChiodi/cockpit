import type { EngineInterface, Register } from 'claude-code'

const MUTATING = new Set(['Bash', 'PowerShell', 'Edit', 'Write', 'NotebookEdit'])

const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['git', 'status', '--porcelain=v1', '--branch'], { timeoutMs: 5000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    $.ui.status(undefined)

    return
  }

  const [head = '', ...changes] = ran.stdout.split('\n').filter(line => line !== '')
  const branch = /^## (?:No commits yet on )?([^.\s]+)/.exec(head)?.[1] ?? '?'
  const ahead = /ahead (\d+)/.exec(head)?.[1]
  const behind = /behind (\d+)/.exec(head)?.[1]
  const parts = [
    `⎇ ${branch}`,
    changes.length > 0 ? `±${changes.length}` : '✓',
    ahead === undefined ? '' : `↑${ahead}`,
    behind === undefined ? '' : `↓${behind}`,
  ]

  $.ui.status(parts.filter(part => part !== '').join(' '))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (MUTATING.has(String(e.tool))) {
      void refresh($)
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })
}
