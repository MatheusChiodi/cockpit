const en = {
  blocked: (why: string) => `pipe-shell-guard blocked the command: ${why}. Download the file, read it, then run it.`,
  failed: 'pipe-shell-guard: the check failed, command refused.',
  pipeShell: 'downloading a script and running it straight in the shell',
  pipeInterpreter: 'downloading code and running it straight away',
  pipeIex: 'downloading a script and running it with Invoke-Expression',
  downloadString: 'running a downloaded script with DownloadString',
  processSubstitution: 'running a downloaded script through process substitution',
}

type Strings = typeof en

const pt: Strings = {
  blocked: why => `pipe-shell-guard bloqueou o comando: ${why}. Baixe o arquivo, leia e só então execute.`,
  failed: 'pipe-shell-guard: a verificação falhou, comando recusado.',
  pipeShell: 'baixar um script e executar direto no shell',
  pipeInterpreter: 'baixar código e executar direto',
  pipeIex: 'baixar um script e executar com Invoke-Expression',
  downloadString: 'executar script baixado com DownloadString',
  processSubstitution: 'executar script baixado via substituição de processo',
}

const es: Strings = {
  blocked: why => `pipe-shell-guard bloqueó el comando: ${why}. Descarga el archivo, léelo y solo entonces ejecútalo.`,
  failed: 'pipe-shell-guard: la verificación falló, comando rechazado.',
  pipeShell: 'descargar un script y ejecutarlo directo en el shell',
  pipeInterpreter: 'descargar código y ejecutarlo directo',
  pipeIex: 'descargar un script y ejecutarlo con Invoke-Expression',
  downloadString: 'ejecutar un script descargado con DownloadString',
  processSubstitution: 'ejecutar un script descargado mediante sustitución de procesos',
}

export type Reason = 'pipeShell' | 'pipeInterpreter' | 'pipeIex' | 'downloadString' | 'processSubstitution'

export const STRINGS = { en, pt, es }
