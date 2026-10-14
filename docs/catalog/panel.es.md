# Siempre visible — 47 mods

[← Volver al README](../../README.es.md)

[`cockpit`](#cockpit) · [`git-band`](#git-band) · [`todo-band`](#todo-band) · [`usage-band`](#usage-band) · [`files-band`](#files-band) · [`error-band`](#error-band) · [`goal-band`](#goal-band) · [`agents-band`](#agents-band) · [`activity-status`](#activity-status) · [`test-status`](#test-status) · [`ci-status`](#ci-status) · [`stash-status`](#stash-status) · [`uncommitted-band`](#uncommitted-band) · [`pr-status`](#pr-status) · [`main-warning-band`](#main-warning-band) · [`conflict-band`](#conflict-band) · [`project-status`](#project-status) · [`ports-band`](#ports-band) · [`deps-status`](#deps-status) · [`todo-count-status`](#todo-count-status) · [`quality-status`](#quality-status) · [`model-status`](#model-status) · [`cost-ticker`](#cost-ticker) · [`idle-clock`](#idle-clock) · [`turn-progress`](#turn-progress) · [`last-prompt-band`](#last-prompt-band) · [`compact-nudge`](#compact-nudge) · [`session-diff-band`](#session-diff-band) · [`shield-band`](#shield-band) · [`reset-countdown`](#reset-countdown) · [`spend-today`](#spend-today) · [`focus-band`](#focus-band) · [`deadline-band`](#deadline-band) · [`pin-band`](#pin-band) · [`clock-status`](#clock-status) · [`day-timer`](#day-timer) · [`commits-today`](#commits-today) · [`dolar-status`](#dolar-status) · [`weather-status`](#weather-status) · [`api-status`](#api-status) · [`terminal-pet`](#terminal-pet) · [`runtime-band`](#runtime-band) · [`docker-band`](#docker-band) · [`env-drift-band`](#env-drift-band) · [`deploy-status`](#deploy-status) · [`todo-new-status`](#todo-new-status) · [`release-status`](#release-status)

## `cockpit`

Panel de ajustes: /cockpit activa y desactiva cada panel y define el idioma de todos los mods.

```
/plugin install cockpit@cockpit
```

![cockpit](../previews/cockpit.svg)

## `git-band`

Franja con la rama, archivos cambiados, líneas añadidas y quitadas, ahead/behind y el último commit.

```
/plugin install git-band@cockpit
```

![git-band](../previews/git-band.svg)

## `todo-band`

Lista de tareas del proyecto fija sobre el prompt, clicable y persistente (/todo).

```
/plugin install todo-band@cockpit
```

![todo-band](../previews/todo-band.svg)

## `usage-band`

Banda fija con barras de colores de contexto, ventanas de 5h y 7 días y costo.

```
/plugin install usage-band@cockpit
```

![usage-band](../previews/usage-band.svg)

## `files-band`

Banda fija con los archivos que Claude modificó en esta sesión.

```
/plugin install files-band@cockpit
```

![files-band](../previews/files-band.svg)

## `error-band`

Mantiene a la vista el último comando que falló y la línea del error, hasta que un comando pase.

```
/plugin install error-band@cockpit
```

![error-band](../previews/error-band.svg)

## `goal-band`

/goal fija el objetivo del proyecto sobre el prompt y en el contexto de Claude.

```
/plugin install goal-band@cockpit
```

![goal-band](../previews/goal-band.svg)

## `agents-band`

Banda que muestra en tiempo real cuántos subagentes están en ejecución y cuáles.

```
/plugin install agents-band@cockpit
```

![agents-band](../previews/agents-band.svg)

## `activity-status`

Status line en vivo con la herramienta que Claude está ejecutando ahora.

```
/plugin install activity-status@cockpit
```

![activity-status](../previews/activity-status.svg)

## `test-status`

Entrada en la status line con el resultado de la última ejecución de tests: pasó o falló, hora y duración.

```
/plugin install test-status@cockpit
```

![test-status](../previews/test-status.svg)

## `ci-status`

Línea de estado con el estado del último workflow de GitHub Actions (vía gh).

```
/plugin install ci-status@cockpit
```

![ci-status](../previews/ci-status.svg)

## `stash-status`

Línea de estado que recuerda cuántos stashes hay guardados.

```
/plugin install stash-status@cockpit
```

![stash-status](../previews/stash-status.svg)

## `uncommitted-band`

Banda de aviso cuando hay cambios sin commit desde hace más de 45 minutos.

```
/plugin install uncommitted-band@cockpit
```

![uncommitted-band](../previews/uncommitted-band.svg)

## `pr-status`

Línea de estado con el pull request de la rama actual y el estado de su revisión (vía gh).

```
/plugin install pr-status@cockpit
```

![pr-status](../previews/pr-status.svg)

## `main-warning-band`

Banda roja mientras estés en main o master.

```
/plugin install main-warning-band@cockpit
```

![main-warning-band](../previews/main-warning-band.svg)

## `conflict-band`

Banda que avisa de un merge o rebase en curso y de archivos en conflicto.

```
/plugin install conflict-band@cockpit
```

![conflict-band](../previews/conflict-band.svg)

## `project-status`

Línea de estado con el nombre y la versión del proyecto, la versión de Node y el gestor de paquetes.

```
/plugin install project-status@cockpit
```

![project-status](../previews/project-status.svg)

## `ports-band`

Banda con los servidores de desarrollo activos en localhost.

```
/plugin install ports-band@cockpit
```

![ports-band](../previews/ports-band.svg)

## `deps-status`

Línea de estado con cuántas dependencias npm están desactualizadas.

```
/plugin install deps-status@cockpit
```

![deps-status](../previews/deps-status.svg)

## `todo-count-status`

Línea de estado con el conteo de TODO, FIXME y HACK en el código versionado.

```
/plugin install todo-count-status@cockpit
```

![todo-count-status](../previews/todo-count-status.svg)

## `quality-status`

Línea de estado con el último resultado de lint, tipos y build.

```
/plugin install quality-status@cockpit
```

![quality-status](../previews/quality-status.svg)

## `model-status`

Status line con el modelo en uso en la sesión.

```
/plugin install model-status@cockpit
```

![model-status](../previews/model-status.svg)

## `cost-ticker`

Status line con el costo del último turno y el total de la sesión.

```
/plugin install cost-ticker@cockpit
```

![cost-ticker](../previews/cost-ticker.svg)

## `idle-clock`

Status line con el tiempo que lleva inactiva la sesión.

```
/plugin install idle-clock@cockpit
```

![idle-clock](../previews/idle-clock.svg)

## `turn-progress`

Status line en vivo con el tiempo transcurrido y las herramientas del turno en curso.

```
/plugin install turn-progress@cockpit
```

![turn-progress](../previews/turn-progress.svg)

## `last-prompt-band`

Banda con tu último pedido, para no perderlo tras respuestas largas.

```
/plugin install last-prompt-band@cockpit
```

![last-prompt-band](../previews/last-prompt-band.svg)

## `compact-nudge`

Banda con botón para compactar cuando el contexto supera el 75%.

```
/plugin install compact-nudge@cockpit
```

![compact-nudge](../previews/compact-nudge.svg)

## `session-diff-band`

Banda con el total de líneas que Claude escribió y eliminó en la sesión.

```
/plugin install session-diff-band@cockpit
```

![session-diff-band](../previews/session-diff-band.svg)

## `shield-band`

Banda con el conteo de llamadas bloqueadas por los guards y el último motivo.

```
/plugin install shield-band@cockpit
```

![shield-band](../previews/shield-band.svg)

## `reset-countdown`

Status line con la cuenta regresiva hasta el reinicio del rate limit más ajustado.

```
/plugin install reset-countdown@cockpit
```

![reset-countdown](../previews/reset-countdown.svg)

## `spend-today`

Status line con el gasto del día sumando todas las sesiones.

```
/plugin install spend-today@cockpit
```

![spend-today](../previews/spend-today.svg)

## `focus-band`

/focus inicia un bloque de foco con barra de progreso fija.

```
/plugin install focus-band@cockpit
```

![focus-band](../previews/focus-band.svg)

## `deadline-band`

/deadline fija una cuenta regresiva para el plazo del proyecto.

```
/plugin install deadline-band@cockpit
```

![deadline-band](../previews/deadline-band.svg)

## `pin-band`

/pin fija hasta 4 recordatorios del proyecto sobre el prompt.

```
/plugin install pin-band@cockpit
```

![pin-band](../previews/pin-band.svg)

## `clock-status`

Línea de estado con el día y la hora (útil en modo pantalla completa).

```
/plugin install clock-status@cockpit
```

![clock-status](../previews/clock-status.svg)

## `day-timer`

Línea de estado con tu tiempo activo de Claude Code en el día, sumando las sesiones.

```
/plugin install day-timer@cockpit
```

![day-timer](../previews/day-timer.svg)

## `commits-today`

Línea de estado con cuántos commits hiciste hoy en este repositorio.

```
/plugin install commits-today@cockpit
```

![commits-today](../previews/commits-today.svg)

## `dolar-status`

Línea de estado con la cotización del dólar en reales (AwesomeAPI).

```
/plugin install dolar-status@cockpit
```

![dolar-status](../previews/dolar-status.svg)

## `weather-status`

Línea de estado con el clima de tu ciudad (wttr.in).

```
/plugin install weather-status@cockpit
```

![weather-status](../previews/weather-status.svg)

## `api-status`

Status line con el estado de la API de Anthropic según su página pública de estado.

```
/plugin install api-status@cockpit
```

![api-status](../previews/api-status.svg)

## `terminal-pet`

Mascota sobre el prompt que reacciona: trabajando, feliz, triste o con sueño.

```
/plugin install terminal-pet@cockpit
```

![terminal-pet](../previews/terminal-pet.svg)

## `runtime-band`

Banda que aparece cuando la versión de Node, Python o Java que pide el proyecto difiere de la instalada.

```
/plugin install runtime-band@cockpit
```

![runtime-band](../previews/runtime-band.svg)

## `docker-band`

Banda que avisa cuando el daemon de Docker está caído o un stack compose tiene servicios detenidos.

```
/plugin install docker-band@cockpit
```

![docker-band](../previews/docker-band.svg)

## `env-drift-band`

Banda con las claves que .env.example tiene y .env no, solo los nombres, nunca los valores.

```
/plugin install env-drift-band@cockpit
```

![env-drift-band](../previews/env-drift-band.svg)

## `deploy-status`

Entrada en la línea de estado con el resultado del último comando de deploy: vercel, netlify, eas, firebase, fly y otros.

```
/plugin install deploy-status@cockpit
```

![deploy-status](../previews/deploy-status.svg)

## `todo-new-status`

Línea de estado que cuenta las líneas TODO, FIXME y HACK añadidas al código en esta sesión.

```
/plugin install todo-new-status@cockpit
```

![todo-new-status](../previews/todo-new-status.svg)

## `release-status`

Línea de estado con la versión del paquete, la última tag y los commits que esperan el próximo release.

```
/plugin install release-status@cockpit
```

![release-status](../previews/release-status.svg)
