import type { EngineInterface, Register } from 'claude-code'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const two = (value: number) => String(value).padStart(2, '0')

const describe = async ($: EngineInterface): Promise<string> => {
  const now = new Date(await $.clock.now())
  const offset = -now.getTimezoneOffset()
  const sign = offset < 0 ? '-' : '+'
  const zone = `UTC${sign}${two(Math.floor(Math.abs(offset) / 60))}:${two(Math.abs(offset) % 60)}`
  const date = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`

  return `Current local time: ${WEEKDAYS[now.getDay()]} ${date} ${two(now.getHours())}:${two(now.getMinutes())} (${zone}). Resolve relative dates against it.`
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' || e.text.startsWith('/')) {
      return next(e)
    }

    return next({ ...e, context: [...(e.context ?? []), await describe($)] })
  })
}
