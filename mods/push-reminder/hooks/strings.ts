const en = {
  unpushed: (count: number) => `${count} commits not pushed for over an hour`,
}

type Strings = typeof en

const pt: Strings = {
  unpushed: count => `${count} commits sem push há mais de uma hora`,
}

const es: Strings = {
  unpushed: count => `${count} commits sin push desde hace más de una hora`,
}

export const STRINGS = { en, pt, es }
