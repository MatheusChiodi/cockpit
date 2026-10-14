const en = {
  command: 'Hold every toast and notification for a while: /quiet <minutes>, /quiet to see it, /quiet off to end it, /quiet test to check it holds',
  hint: '<minutes> | off | test',
  probe: 'quiet test',
  holding: 'The test toast and notification were held. The window works.',
  open: 'Not quiet: the test toast and notification were shown.',
  on: (minutes: number, until: string) => `Quiet for ${minutes} min, until ${until}. Toasts and notifications are held.`,
  off: (held: number) => `Quiet window ended. ${held === 1 ? '1 notice was' : `${held} notices were`} held.`,
  status: (until: string, held: number) => `Quiet until ${until}. ${held} held so far.`,
  none: 'Not quiet. /quiet <minutes> holds toasts and notifications.',
  usage: 'Give the minutes, from 1 to 480: /quiet 45',
  over: (held: number) => `Quiet window over. ${held === 1 ? '1 notice was' : `${held} notices were`} held.`,
}

type Strings = typeof en

const pt: Strings = {
  command: 'Segura todos os toasts e notificações por um tempo: /quiet <minutos>, /quiet para ver, /quiet off para encerrar, /quiet test para conferir que segura',
  hint: '<minutos> | off | test',
  probe: 'teste de silêncio',
  holding: 'O toast e a notificação de teste foram retidos. A janela funciona.',
  open: 'Sem silêncio: o toast e a notificação de teste foram exibidos.',
  on: (minutes, until) => `Silêncio por ${minutes} min, até ${until}. Toasts e notificações ficam retidos.`,
  off: held => `Janela de silêncio encerrada. ${held === 1 ? '1 aviso foi retido' : `${held} avisos foram retidos`}.`,
  status: (until, held) => `Silêncio até ${until}. ${held} retidos até agora.`,
  none: 'Sem silêncio. /quiet <minutos> segura toasts e notificações.',
  usage: 'Informe os minutos, de 1 a 480: /quiet 45',
  over: held => `Janela de silêncio terminou. ${held === 1 ? '1 aviso foi retido' : `${held} avisos foram retidos`}.`,
}

const es: Strings = {
  command: 'Retiene todos los toasts y notificaciones un rato: /quiet <minutos>, /quiet para verlo, /quiet off para terminar, /quiet test para comprobar',
  hint: '<minutos> | off | test',
  probe: 'prueba de silencio',
  holding: 'El toast y la notificación de prueba quedaron retenidos. La ventana funciona.',
  open: 'Sin silencio: se mostraron el toast y la notificación de prueba.',
  on: (minutes, until) => `Silencio por ${minutes} min, hasta ${until}. Los toasts y notificaciones quedan retenidos.`,
  off: held => `Ventana de silencio terminada. ${held === 1 ? 'Se retuvo 1 aviso' : `Se retuvieron ${held} avisos`}.`,
  status: (until, held) => `Silencio hasta ${until}. ${held} retenidos hasta ahora.`,
  none: 'Sin silencio. /quiet <minutos> retiene toasts y notificaciones.',
  usage: 'Indica los minutos, de 1 a 480: /quiet 45',
  over: held => `La ventana de silencio terminó. ${held === 1 ? 'Se retuvo 1 aviso' : `Se retuvieron ${held} avisos`}.`,
}

export const STRINGS = { en, pt, es }
