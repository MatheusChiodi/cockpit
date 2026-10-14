# Interfaz — 12 mods

[← Volver al README](../../README.es.md)

[`turn-timer`](#turn-timer) · [`tool-tally`](#tool-tally) · [`file-trail`](#file-trail) · [`cmd-log`](#cmd-log) · [`git-status-line`](#git-status-line) · [`context-meter`](#context-meter) · [`rate-limit-watch`](#rate-limit-watch) · [`session-clock`](#session-clock) · [`diff-pane`](#diff-pane) · [`turn-history`](#turn-history) · [`prompt-history`](#prompt-history) · [`agent-pane`](#agent-pane)

## `turn-timer`

Banda sobre el prompt con duración, tools y tokens del último turno.

```
/plugin install turn-timer@cockpit
```

![turn-timer](../previews/turn-timer.svg)

## `tool-tally`

/tally abre un panel con el recuento de llamadas por herramienta.

```
/plugin install tool-tally@cockpit
```

![tool-tally](../previews/tool-tally.svg)

## `file-trail`

/trail abre un panel con los archivos leídos y modificados en la sesión.

```
/plugin install file-trail@cockpit
```

![file-trail](../previews/file-trail.svg)

## `cmd-log`

/cmdlog abre un panel con los comandos de shell, estado y duración.

```
/plugin install cmd-log@cockpit
```

![cmd-log](../previews/cmd-log.svg)

## `git-status-line`

Status line con rama, archivos modificados y commits por delante/detrás.

```
/plugin install git-status-line@cockpit
```

![git-status-line](../previews/git-status-line.svg)

## `context-meter`

Status line con barra de contexto y coste; avisa al 80% y 90%.

```
/plugin install context-meter@cockpit
```

![context-meter](../previews/context-meter.svg)

## `rate-limit-watch`

Toast cuando la ventana de 5h o 7 días supera 75/90/95%; /limits lista el uso.

```
/plugin install rate-limit-watch@cockpit
```

![rate-limit-watch](../previews/rate-limit-watch.svg)

## `session-clock`

Status line con tiempo de sesión y número de prompts.

```
/plugin install session-clock@cockpit
```

![session-clock](../previews/session-clock.svg)

## `diff-pane`

/edits abre un panel con cada Edit y Write de la sesión, líneas añadidas y eliminadas, del más nuevo al más antiguo.

```
/plugin install diff-pane@cockpit
```

![diff-pane](../previews/diff-pane.svg)

## `turn-history`

/turns abre un panel con una fila por turno terminado: duración, llamadas de herramienta, tokens de salida y una ✗ en los que fallaron.

```
/plugin install turn-history@cockpit
```

![turn-history](../previews/turn-history.svg)

## `prompt-history`

/prompts abre un panel con los prompts escritos en esta sesión; pulsa uno para volver a ponerlo en la caja de prompt.

```
/plugin install prompt-history@cockpit
```

![prompt-history](../previews/prompt-history.svg)

## `agent-pane`

/crew abre un panel con los subagentes de la sesión, su tipo y estado, actualizado mientras alguno se ejecuta.

```
/plugin install agent-pane@cockpit
```

![agent-pane](../previews/agent-pane.svg)
