const en = {
  label: 'env',
  missing: (count: number) => `${count} missing`,
}

type Strings = typeof en

const pt: Strings = {
  label: 'env',
  missing: count => `${count} faltando`,
}

const es: Strings = {
  label: 'env',
  missing: count => `${count} faltan`,
}

export const STRINGS = { en, pt, es }
