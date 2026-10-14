# Foco y notificaciones — 12 mods

[← Volver al README](../../README.es.md)

[`turn-notify`](#turn-notify) · [`break-reminder`](#break-reminder) · [`daily-streak`](#daily-streak) · [`error-notify`](#error-notify) · [`needs-you-notify`](#needs-you-notify) · [`agent-done-notify`](#agent-done-notify) · [`long-cmd-notify`](#long-cmd-notify) · [`tests-notify`](#tests-notify) · [`ci-notify`](#ci-notify) · [`pr-review-notify`](#pr-review-notify) · [`rate-limit-notify`](#rate-limit-notify) · [`hydrate`](#hydrate)

## `turn-notify`

Notificación nativa cuando termina un turno de 30s o más.

```
/plugin install turn-notify@cockpit
```

![turn-notify](../previews/turn-notify.svg)

## `break-reminder`

Un toast cada 50 minutos de sesión que te recuerda hacer una pausa.

```
/plugin install break-reminder@cockpit
```

![break-reminder](../previews/break-reminder.svg)

## `daily-streak`

Cuenta tus días seguidos con Claude Code; un toast al abrir y el comando /streak.

```
/plugin install daily-streak@cockpit
```

![daily-streak](../previews/daily-streak.svg)

## `error-notify`

Envía una notificación nativa cuando un turno termina en error o rechazo.

```
/plugin install error-notify@cockpit
```

![error-notify](../previews/error-notify.svg)

## `needs-you-notify`

Envía una notificación nativa cuando Claude se detiene a preguntarte algo o a pedir permiso.

```
/plugin install needs-you-notify@cockpit
```

![needs-you-notify](../previews/needs-you-notify.svg)

## `agent-done-notify`

Envía una notificación nativa cuando termina un subagente que corrió 30 segundos o más.

```
/plugin install agent-done-notify@cockpit
```

![agent-done-notify](../previews/agent-done-notify.svg)

## `long-cmd-notify`

Envía una notificación nativa cuando termina un comando de shell que corrió dos minutos o más.

```
/plugin install long-cmd-notify@cockpit
```

![long-cmd-notify](../previews/long-cmd-notify.svg)

## `tests-notify`

Envía una notificación nativa con aprobado o fallido cuando termina una ejecución de tests de 30 segundos o más.

```
/plugin install tests-notify@cockpit
```

![tests-notify](../previews/tests-notify.svg)

## `ci-notify`

Consulta GitHub Actions cada dos minutos y avisa una vez cuando termina un workflow en curso.

```
/plugin install ci-notify@cockpit
```

![ci-notify](../previews/ci-notify.svg)

## `pr-review-notify`

Consulta el pull request de la rama actual cada tres minutos y avisa una vez cuando cambia la decisión de revisión.

```
/plugin install pr-review-notify@cockpit
```

![pr-review-notify](../previews/pr-review-notify.svg)

## `rate-limit-notify`

Envía una notificación nativa la primera vez que una ventana de límite de uso supera el 90%, con la hora del reinicio.

```
/plugin install rate-limit-notify@cockpit
```

![rate-limit-notify](../previews/rate-limit-notify.svg)

## `hydrate`

Toast cada 60 minutos de uso real recordando beber agua.

```
/plugin install hydrate@cockpit
```

![hydrate](../previews/hydrate.svg)
