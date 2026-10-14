const en = {
  drift: (branch: string, files: number) => `Branch ${branch}, but ${files} edited files have nothing to do with it.`,
}

type Strings = typeof en

const pt: Strings = {
  drift: (branch, files) => `Branch ${branch}, mas ${files} arquivos editados não têm a ver com ela.`,
}

const es: Strings = {
  drift: (branch, files) => `Rama ${branch}, pero ${files} archivos editados no tienen que ver con ella.`,
}

export const STRINGS = { en, pt, es }
