const en = {
  denied: (pkg: string, path: string) =>
    `missing-import-guard: "${pkg}" (imported in ${path}) is not in package.json or node_modules. Ask the person to install it, or use a package that is already installed.`,
  failed: 'missing-import-guard: the check failed, confirm the imported packages are installed.',
}

type Strings = typeof en

const pt: Strings = {
  denied: (pkg, path) =>
    `missing-import-guard: "${pkg}" (importado em ${path}) não está no package.json nem no node_modules. Peça para a pessoa instalar, ou use um pacote que já esteja instalado.`,
  failed: 'missing-import-guard: a verificação falhou, confirme que os pacotes importados estão instalados.',
}

const es: Strings = {
  denied: (pkg, path) =>
    `missing-import-guard: "${pkg}" (importado en ${path}) no está en package.json ni en node_modules. Pide a la persona que lo instale, o usa un paquete que ya esté instalado.`,
  failed: 'missing-import-guard: la verificación falló, confirma que los paquetes importados están instalados.',
}

export const STRINGS = { en, pt, es }
