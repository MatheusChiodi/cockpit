const en = {
  ask: (what: string) => `persistence-guard: ${what}. This makes something run on its own later. Confirm before running.`,
  failed: 'persistence-guard: the check failed, confirm manually.',
  cron: 'editing the crontab',
  cronDir: 'writing a cron job under /etc/cron*',
  schtasks: 'creating a Windows scheduled task',
  systemd: 'enabling a systemd unit',
  launchd: 'loading a launchd job',
  scheduledTask: 'registering a scheduled task',
  startup: 'writing into a Startup folder',
}

type Strings = typeof en

const pt: Strings = {
  ask: what => `persistence-guard: ${what}. Isso faz algo rodar sozinho depois. Confirme antes de rodar.`,
  failed: 'persistence-guard: a verificação falhou, confirme manualmente.',
  cron: 'editar o crontab',
  cronDir: 'gravar um cron job em /etc/cron*',
  schtasks: 'criar uma tarefa agendada do Windows',
  systemd: 'habilitar uma unit do systemd',
  launchd: 'carregar um job do launchd',
  scheduledTask: 'registrar uma tarefa agendada',
  startup: 'gravar em uma pasta Startup',
}

const es: Strings = {
  ask: what => `persistence-guard: ${what}. Esto hace que algo se ejecute solo después. Confirma antes de ejecutar.`,
  failed: 'persistence-guard: la verificación falló, confirma manualmente.',
  cron: 'editar el crontab',
  cronDir: 'escribir un cron job en /etc/cron*',
  schtasks: 'crear una tarea programada de Windows',
  systemd: 'habilitar una unit de systemd',
  launchd: 'cargar un job de launchd',
  scheduledTask: 'registrar una tarea programada',
  startup: 'escribir en una carpeta Startup',
}

export type Reason = Exclude<keyof Strings, 'ask' | 'failed'>

export const STRINGS = { en, pt, es }
