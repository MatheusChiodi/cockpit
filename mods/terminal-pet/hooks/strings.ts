const en = {
  label: 'pet',
  idle: 'ready whenever you are',
  working: 'working…',
  happy: 'it worked!',
  sad: 'something failed, let’s go again',
  sleepy: 'nobody has talked to me in a while',
}

type Strings = typeof en

const pt: Strings = {
  label: 'pet',
  idle: 'pronto quando você estiver',
  working: 'trabalhando…',
  happy: 'deu certo!',
  sad: 'algo falhou, vamos de novo',
  sleepy: 'faz tempo que ninguém fala comigo',
}

const es: Strings = {
  label: 'pet',
  idle: 'listo cuando quieras',
  working: 'trabajando…',
  happy: '¡funcionó!',
  sad: 'algo falló, vamos otra vez',
  sleepy: 'hace rato que nadie me habla',
}

export const STRINGS = { en, pt, es }
