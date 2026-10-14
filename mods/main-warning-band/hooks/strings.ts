const en = {
  label: 'branch',
  protected: ' is protected',
  hint: 'create another before changing anything: git switch -c name',
}

type Strings = typeof en

const pt: Strings = {
  label: 'branch',
  protected: ' é protegida',
  hint: 'crie outra antes de alterar: git switch -c nome',
}

const es: Strings = {
  label: 'rama',
  protected: ' está protegida',
  hint: 'crea otra antes de cambiar nada: git switch -c nombre',
}

export const STRINGS = { en, pt, es }
