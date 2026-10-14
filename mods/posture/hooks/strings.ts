const en = {
  checks: [
    'Shoulders down, away from your ears.',
    'Feet flat on the floor, back against the chair.',
    'Screen at eye level, chin slightly back.',
    'Wrists straight, elbows loose at your sides.',
  ],
}

type Strings = typeof en

const pt: Strings = {
  checks: [
    'Ombros para baixo, longe das orelhas.',
    'Pés apoiados no chão, costas na cadeira.',
    'Tela na altura dos olhos, queixo levemente para trás.',
    'Punhos retos, cotovelos soltos ao lado do corpo.',
  ],
}

const es: Strings = {
  checks: [
    'Hombros abajo, lejos de las orejas.',
    'Pies apoyados en el suelo, espalda en la silla.',
    'Pantalla a la altura de los ojos, mentón ligeramente atrás.',
    'Muñecas rectas, codos sueltos a los lados.',
  ],
}

export const STRINGS = { en, pt, es }
