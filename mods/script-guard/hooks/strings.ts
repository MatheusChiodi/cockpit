const en = {
  denied: (name: string, known: string) =>
    `script-guard: package.json has no "${name}" script. ${known === '' ? 'It declares no scripts.' : `Available: ${known}.`}`,
  failed: 'script-guard: the check failed, confirm the script exists in package.json.',
}

type Strings = typeof en

const pt: Strings = {
  denied: (name, known) =>
    `script-guard: o package.json não tem o script "${name}". ${known === '' ? 'Ele não declara scripts.' : `Disponíveis: ${known}.`}`,
  failed: 'script-guard: a verificação falhou, confirme que o script existe no package.json.',
}

const es: Strings = {
  denied: (name, known) =>
    `script-guard: package.json no tiene el script "${name}". ${known === '' ? 'No declara scripts.' : `Disponibles: ${known}.`}`,
  failed: 'script-guard: la verificación falló, confirma que el script existe en package.json.',
}

export const STRINGS = { en, pt, es }
