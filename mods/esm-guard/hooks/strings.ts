const en = {
  require: (path: string) =>
    `esm-guard: package.json is "type": "module", so ${path} cannot use require(). Use import (or createRequire for a CommonJS-only package).`,
  exports: (path: string) =>
    `esm-guard: package.json is "type": "module", so ${path} cannot use module.exports. Use export / export default.`,
  dirname: (name: string, path: string) =>
    `esm-guard: ${name} does not exist in ES modules (${path}). Use import.meta.dirname, or fileURLToPath(import.meta.url) before Node 20.11.`,
  failed: 'esm-guard: the check failed, confirm the file is written as an ES module.',
}

type Strings = typeof en

const pt: Strings = {
  require: path =>
    `esm-guard: o package.json é "type": "module", então ${path} não pode usar require(). Use import (ou createRequire para um pacote só CommonJS).`,
  exports: path =>
    `esm-guard: o package.json é "type": "module", então ${path} não pode usar module.exports. Use export / export default.`,
  dirname: (name, path) =>
    `esm-guard: ${name} não existe em módulos ES (${path}). Use import.meta.dirname, ou fileURLToPath(import.meta.url) antes do Node 20.11.`,
  failed: 'esm-guard: a verificação falhou, confirme que o arquivo está escrito como módulo ES.',
}

const es: Strings = {
  require: path =>
    `esm-guard: package.json es "type": "module", así que ${path} no puede usar require(). Usa import (o createRequire para un paquete solo CommonJS).`,
  exports: path =>
    `esm-guard: package.json es "type": "module", así que ${path} no puede usar module.exports. Usa export / export default.`,
  dirname: (name, path) =>
    `esm-guard: ${name} no existe en módulos ES (${path}). Usa import.meta.dirname, o fileURLToPath(import.meta.url) antes de Node 20.11.`,
  failed: 'esm-guard: la verificación falló, confirma que el archivo está escrito como módulo ES.',
}

export const STRINGS = { en, pt, es }
