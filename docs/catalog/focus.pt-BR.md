# Foco e notificações — 19 mods

[← Voltar ao README](../../README.pt-BR.md)

[`turn-notify`](#turn-notify) · [`break-reminder`](#break-reminder) · [`daily-streak`](#daily-streak) · [`error-notify`](#error-notify) · [`needs-you-notify`](#needs-you-notify) · [`agent-done-notify`](#agent-done-notify) · [`long-cmd-notify`](#long-cmd-notify) · [`tests-notify`](#tests-notify) · [`ci-notify`](#ci-notify) · [`pr-review-notify`](#pr-review-notify) · [`rate-limit-notify`](#rate-limit-notify) · [`hydrate`](#hydrate) · [`posture`](#posture) · [`eye-rest`](#eye-rest) · [`stand-up`](#stand-up) · [`alarms`](#alarms) · [`remind`](#remind) · [`timebox`](#timebox) · [`session-cap`](#session-cap)

## `turn-notify`

Notificação nativa quando um turno de 30s ou mais termina.

```
/plugin install turn-notify@cockpit
```

![turn-notify](../previews/turn-notify.svg)

## `break-reminder`

Toast a cada 50 minutos de sessão lembrando de fazer uma pausa.

```
/plugin install break-reminder@cockpit
```

![break-reminder](../previews/break-reminder.svg)

## `daily-streak`

Conta seus dias seguidos de Claude Code; toast ao abrir e comando /streak.

```
/plugin install daily-streak@cockpit
```

![daily-streak](../previews/daily-streak.svg)

## `error-notify`

Envia uma notificação nativa quando um turno termina em erro ou recusa.

```
/plugin install error-notify@cockpit
```

![error-notify](../previews/error-notify.svg)

## `needs-you-notify`

Envia uma notificação nativa quando o Claude para para te perguntar algo ou pedir permissão.

```
/plugin install needs-you-notify@cockpit
```

![needs-you-notify](../previews/needs-you-notify.svg)

## `agent-done-notify`

Envia uma notificação nativa quando um subagente que rodou 30 segundos ou mais termina.

```
/plugin install agent-done-notify@cockpit
```

![agent-done-notify](../previews/agent-done-notify.svg)

## `long-cmd-notify`

Envia uma notificação nativa quando um comando de shell que rodou dois minutos ou mais termina.

```
/plugin install long-cmd-notify@cockpit
```

![long-cmd-notify](../previews/long-cmd-notify.svg)

## `tests-notify`

Envia uma notificação nativa com passou ou falhou quando uma execução de testes de 30 segundos ou mais termina.

```
/plugin install tests-notify@cockpit
```

![tests-notify](../previews/tests-notify.svg)

## `ci-notify`

Consulta o GitHub Actions a cada dois minutos e avisa uma vez quando um workflow em andamento termina.

```
/plugin install ci-notify@cockpit
```

![ci-notify](../previews/ci-notify.svg)

## `pr-review-notify`

Consulta o pull request da branch atual a cada três minutos e avisa uma vez quando a decisão de revisão muda.

```
/plugin install pr-review-notify@cockpit
```

![pr-review-notify](../previews/pr-review-notify.svg)

## `rate-limit-notify`

Envia uma notificação nativa na primeira vez que uma janela de limite de uso passa de 90%, com a hora do reset.

```
/plugin install rate-limit-notify@cockpit
```

![rate-limit-notify](../previews/rate-limit-notify.svg)

## `hydrate`

Toast a cada 60 minutos de uso real lembrando de beber água.

```
/plugin install hydrate@cockpit
```

![hydrate](../previews/hydrate.svg)

## `posture`

Toast a cada 30 minutos de uso com uma checagem rápida de postura, alternando entre quatro.

```
/plugin install posture@cockpit
```

![posture](../previews/posture.svg)

## `eye-rest`

Regra 20-20-20: a cada 20 minutos de uso, olhe a 6 metros de distância por 20 segundos.

```
/plugin install eye-rest@cockpit
```

![eye-rest](../previews/eye-rest.svg)

## `stand-up`

Toast após duas horas de uso sem uma pausa de 10 minutos: levante e ande um pouco.

```
/plugin install stand-up@cockpit
```

![stand-up](../previews/stand-up.svg)

## `alarms`

/alarm cria alarmes diários em um horário local, mantidos entre sessões, com toast e notificação.

```
/plugin install alarms@cockpit
```

![alarms](../previews/alarms.svg)

## `remind`

/remind <minutos> <texto> dispara toast e notificação depois desse tempo.

```
/plugin install remind@cockpit
```

![remind](../previews/remind.svg)

## `timebox`

/timebox <minutos> <o quê> faz contagem regressiva na status line, avisa em 80% e notifica no fim.

```
/plugin install timebox@cockpit
```

![timebox](../previews/timebox.svg)

## `session-cap`

Toast após três horas de uso contínuo em uma sessão, e de novo a cada hora.

```
/plugin install session-cap@cockpit
```

![session-cap](../previews/session-cap.svg)
