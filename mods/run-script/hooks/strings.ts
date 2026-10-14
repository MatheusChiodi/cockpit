const en = {
  command: "Run a package.json script with the project's package manager, or list the scripts",
  hint: '[script]',
  noPackage: 'No package.json in this project.',
  noScripts: 'package.json has no scripts.',
  unknown: (name: string, known: string) => `No script "${name}". Available: ${known}`,
  header: (command: string) => `$ ${command}`,
  exit: (code: number) => `exit ${code}`,
  failed: 'Could not run the package manager.',
  noOutput: '(no output)',
}

type Strings = typeof en

const pt: Strings = {
  command: 'Executa um script do package.json com o gerenciador de pacotes do projeto, ou lista os scripts',
  hint: '[script]',
  noPackage: 'Nenhum package.json neste projeto.',
  noScripts: 'O package.json não tem scripts.',
  unknown: (name, known) => `Script "${name}" inexistente. Disponíveis: ${known}`,
  header: command => `$ ${command}`,
  exit: code => `saída ${code}`,
  failed: 'Não foi possível executar o gerenciador de pacotes.',
  noOutput: '(sem saída)',
}

const es: Strings = {
  command: 'Ejecuta un script del package.json con el gestor de paquetes del proyecto, o lista los scripts',
  hint: '[script]',
  noPackage: 'No hay package.json en este proyecto.',
  noScripts: 'El package.json no tiene scripts.',
  unknown: (name, known) => `No existe el script "${name}". Disponibles: ${known}`,
  header: command => `$ ${command}`,
  exit: code => `salida ${code}`,
  failed: 'No se pudo ejecutar el gestor de paquetes.',
  noOutput: '(sin salida)',
}

export const STRINGS = { en, pt, es }
