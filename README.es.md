# Cockpit

[English](README.md) · [Português](README.pt-BR.md) · **Español**

**Un panel de instrumentos para Claude Code.** 80 mods para la terminal: 40 paneles que quedan siempre a la vista y se activan o desactivan en `/cockpit`, además de guards, automatizaciones de prompt, comandos instantáneos y ayudas de foco. Cada mod es un plugin pequeño que se instala con una línea.

![El panel completo de Cockpit en una terminal](docs/cockpit.svg)

```
/plugin marketplace add MatheusChiodi/cockpit
/plugin install git-band@cockpit
/cockpit
```

> Los mods son funciones TypeScript que se ejecutan dentro de Claude Code y cambian su comportamiento: interceptan tool calls, reescriben prompts, dibujan paneles y franjas y registran slash commands. Requieren Claude Code **2.1.287 o más nuevo** (hecho sobre la 2.1.296).

## Instalación

**Desde GitHub**, dentro de Claude Code:

```
/plugin marketplace add MatheusChiodi/cockpit
/plugin install <mod>@cockpit
```

**Desde una carpeta local:**

```bash
git clone https://github.com/MatheusChiodi/cockpit
claude plugin marketplace add ./cockpit
claude plugin install git-guard@cockpit
```

**Solo para probar uno**, sin instalar:

```bash
claude --plugin-dir ./cockpit/mods/turn-timer
```

Quita un mod con `/plugin uninstall <mod>@cockpit`. Apaga todos de una vez con `claude --safe-mode`.

## Paneles y ajustes

Los 40 mods de **Siempre visible** son paneles: franjas sobre el prompt o entradas en la status line que se actualizan solas (git, contexto, costo, tests, CI, tareas, plazo, clima). Ninguno necesita un comando para aparecer.

El mod `cockpit` es su panel de ajustes y llega como dependencia de cualquier panel.

| Para | Haz |
| --- | --- |
| Abrir los ajustes | `/cockpit` — Tab y flechas mueven, Enter o clic alterna, Esc cierra |
| Desactivar o activar un panel | `/cockpit off git-band` · `/cockpit on git-band` |
| Alternar todos | `/cockpit off all` · `/cockpit on all` |
| Cambiar el idioma | `/cockpit lang en` · `/cockpit lang pt` · `/cockpit lang es` |

Las dos elecciones se conservan entre sesiones. Una franja desaparece o vuelve al instante; una entrada de status line desaparece al instante y vuelve en su próxima actualización. Un panel desactivado sigue instalado, solo no dibuja.

Las franjas se apilan en el orden en que cargan los mods, y la status line guarda una entrada por mod. Con muchos paneles activos la terminal se llena: empieza con cuatro o cinco y ajusta en `/cockpit`.

## Idioma

Cada mod habla **inglés** por defecto y puede cambiar a **portugués de Brasil** o **español**. El idioma se define una vez, en `/cockpit`, y todos los mods instalados lo siguen: etiquetas de las franjas, palabras de la status line, salida de los comandos, mensajes de los guards, toasts y notificaciones. Sin el mod `cockpit` instalado, los mods quedan en inglés.

Las descripciones de los slash commands en el autocompletado se leen al iniciar la sesión, así que siguen el cambio de idioma en la sesión siguiente. Para que el propio Claude responda en el idioma elegido, instala `reply-language`.

## Catálogo

| | |
| --- | --- |
| **Siempre visible** (41) | [`cockpit`](#cockpit) · [`git-band`](#git-band) · [`todo-band`](#todo-band) · [`usage-band`](#usage-band) · [`files-band`](#files-band) · [`error-band`](#error-band) · [`goal-band`](#goal-band) · [`agents-band`](#agents-band) · [`activity-status`](#activity-status) · [`test-status`](#test-status) · [`ci-status`](#ci-status) · [`stash-status`](#stash-status) · [`uncommitted-band`](#uncommitted-band) · [`pr-status`](#pr-status) · [`main-warning-band`](#main-warning-band) · [`conflict-band`](#conflict-band) · [`project-status`](#project-status) · [`ports-band`](#ports-band) · [`deps-status`](#deps-status) · [`todo-count-status`](#todo-count-status) · [`quality-status`](#quality-status) · [`model-status`](#model-status) · [`cost-ticker`](#cost-ticker) · [`idle-clock`](#idle-clock) · [`turn-progress`](#turn-progress) · [`last-prompt-band`](#last-prompt-band) · [`compact-nudge`](#compact-nudge) · [`session-diff-band`](#session-diff-band) · [`shield-band`](#shield-band) · [`reset-countdown`](#reset-countdown) · [`spend-today`](#spend-today) · [`focus-band`](#focus-band) · [`deadline-band`](#deadline-band) · [`pin-band`](#pin-band) · [`clock-status`](#clock-status) · [`day-timer`](#day-timer) · [`commits-today`](#commits-today) · [`dolar-status`](#dolar-status) · [`weather-status`](#weather-status) · [`api-status`](#api-status) · [`terminal-pet`](#terminal-pet) |
| **Seguridad** (14) | [`rm-guard`](#rm-guard) · [`env-guard`](#env-guard) · [`git-guard`](#git-guard) · [`secret-scan`](#secret-scan) · [`prompt-secret-guard`](#prompt-secret-guard) · [`lockfile-guard`](#lockfile-guard) · [`path-jail`](#path-jail) · [`main-branch-guard`](#main-branch-guard) · [`generated-guard`](#generated-guard) · [`sql-guard`](#sql-guard) · [`prod-guard`](#prod-guard) · [`install-ask`](#install-ask) · [`pipe-shell-guard`](#pipe-shell-guard) · [`big-read-guard`](#big-read-guard) |
| **Interfaz** (8) | [`turn-timer`](#turn-timer) · [`tool-tally`](#tool-tally) · [`file-trail`](#file-trail) · [`cmd-log`](#cmd-log) · [`git-status-line`](#git-status-line) · [`context-meter`](#context-meter) · [`rate-limit-watch`](#rate-limit-watch) · [`session-clock`](#session-clock) |
| **Prompt y modelo** (8) | [`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) · [`reply-language`](#reply-language) |
| **Comandos** (6) | [`quick-notes`](#quick-notes) · [`pomodoro`](#pomodoro) · [`copy-last`](#copy-last) · [`session-stats`](#session-stats) · [`quote-selection`](#quote-selection) · [`git-peek`](#git-peek) |
| **Foco y notificaciones** (3) | [`turn-notify`](#turn-notify) · [`break-reminder`](#break-reminder) · [`daily-streak`](#daily-streak) |

## Siempre visible (41)

### `cockpit`

Panel de ajustes: /cockpit activa y desactiva cada panel y define el idioma de todos los mods.

```
/plugin install cockpit@cockpit
```

![cockpit](docs/previews/cockpit.svg)

### `git-band`

Franja con la rama, archivos cambiados, líneas añadidas y quitadas, ahead/behind y el último commit.

```
/plugin install git-band@cockpit
```

![git-band](docs/previews/git-band.svg)

### `todo-band`

Lista de tareas del proyecto fija sobre el prompt, clicable y persistente (/todo).

```
/plugin install todo-band@cockpit
```

![todo-band](docs/previews/todo-band.svg)

### `usage-band`

Banda fija con barras de colores de contexto, ventanas de 5h y 7 días y costo.

```
/plugin install usage-band@cockpit
```

![usage-band](docs/previews/usage-band.svg)

### `files-band`

Banda fija con los archivos que Claude modificó en esta sesión.

```
/plugin install files-band@cockpit
```

![files-band](docs/previews/files-band.svg)

### `error-band`

Mantiene a la vista el último comando que falló y la línea del error, hasta que un comando pase.

```
/plugin install error-band@cockpit
```

![error-band](docs/previews/error-band.svg)

### `goal-band`

/goal fija el objetivo del proyecto sobre el prompt y en el contexto de Claude.

```
/plugin install goal-band@cockpit
```

![goal-band](docs/previews/goal-band.svg)

### `agents-band`

Banda que muestra en tiempo real cuántos subagentes están en ejecución y cuáles.

```
/plugin install agents-band@cockpit
```

![agents-band](docs/previews/agents-band.svg)

### `activity-status`

Status line en vivo con la herramienta que Claude está ejecutando ahora.

```
/plugin install activity-status@cockpit
```

![activity-status](docs/previews/activity-status.svg)

### `test-status`

Entrada en la status line con el resultado de la última ejecución de tests: pasó o falló, hora y duración.

```
/plugin install test-status@cockpit
```

![test-status](docs/previews/test-status.svg)

### `ci-status`

Línea de estado con el estado del último workflow de GitHub Actions (vía gh).

```
/plugin install ci-status@cockpit
```

![ci-status](docs/previews/ci-status.svg)

### `stash-status`

Línea de estado que recuerda cuántos stashes hay guardados.

```
/plugin install stash-status@cockpit
```

![stash-status](docs/previews/stash-status.svg)

### `uncommitted-band`

Banda de aviso cuando hay cambios sin commit desde hace más de 45 minutos.

```
/plugin install uncommitted-band@cockpit
```

![uncommitted-band](docs/previews/uncommitted-band.svg)

### `pr-status`

Línea de estado con el pull request de la rama actual y el estado de su revisión (vía gh).

```
/plugin install pr-status@cockpit
```

![pr-status](docs/previews/pr-status.svg)

### `main-warning-band`

Banda roja mientras estés en main o master.

```
/plugin install main-warning-band@cockpit
```

![main-warning-band](docs/previews/main-warning-band.svg)

### `conflict-band`

Banda que avisa de un merge o rebase en curso y de archivos en conflicto.

```
/plugin install conflict-band@cockpit
```

![conflict-band](docs/previews/conflict-band.svg)

### `project-status`

Línea de estado con el nombre y la versión del proyecto, la versión de Node y el gestor de paquetes.

```
/plugin install project-status@cockpit
```

![project-status](docs/previews/project-status.svg)

### `ports-band`

Banda con los servidores de desarrollo activos en localhost.

```
/plugin install ports-band@cockpit
```

![ports-band](docs/previews/ports-band.svg)

### `deps-status`

Línea de estado con cuántas dependencias npm están desactualizadas.

```
/plugin install deps-status@cockpit
```

![deps-status](docs/previews/deps-status.svg)

### `todo-count-status`

Línea de estado con el conteo de TODO, FIXME y HACK en el código versionado.

```
/plugin install todo-count-status@cockpit
```

![todo-count-status](docs/previews/todo-count-status.svg)

### `quality-status`

Línea de estado con el último resultado de lint, tipos y build.

```
/plugin install quality-status@cockpit
```

![quality-status](docs/previews/quality-status.svg)

### `model-status`

Status line con el modelo en uso en la sesión.

```
/plugin install model-status@cockpit
```

![model-status](docs/previews/model-status.svg)

### `cost-ticker`

Status line con el costo del último turno y el total de la sesión.

```
/plugin install cost-ticker@cockpit
```

![cost-ticker](docs/previews/cost-ticker.svg)

### `idle-clock`

Status line con el tiempo que lleva inactiva la sesión.

```
/plugin install idle-clock@cockpit
```

![idle-clock](docs/previews/idle-clock.svg)

### `turn-progress`

Status line en vivo con el tiempo transcurrido y las herramientas del turno en curso.

```
/plugin install turn-progress@cockpit
```

![turn-progress](docs/previews/turn-progress.svg)

### `last-prompt-band`

Banda con tu último pedido, para no perderlo tras respuestas largas.

```
/plugin install last-prompt-band@cockpit
```

![last-prompt-band](docs/previews/last-prompt-band.svg)

### `compact-nudge`

Banda con botón para compactar cuando el contexto supera el 75%.

```
/plugin install compact-nudge@cockpit
```

![compact-nudge](docs/previews/compact-nudge.svg)

### `session-diff-band`

Banda con el total de líneas que Claude escribió y eliminó en la sesión.

```
/plugin install session-diff-band@cockpit
```

![session-diff-band](docs/previews/session-diff-band.svg)

### `shield-band`

Banda con el conteo de llamadas bloqueadas por los guards y el último motivo.

```
/plugin install shield-band@cockpit
```

![shield-band](docs/previews/shield-band.svg)

### `reset-countdown`

Status line con la cuenta regresiva hasta el reinicio del rate limit más ajustado.

```
/plugin install reset-countdown@cockpit
```

![reset-countdown](docs/previews/reset-countdown.svg)

### `spend-today`

Status line con el gasto del día sumando todas las sesiones.

```
/plugin install spend-today@cockpit
```

![spend-today](docs/previews/spend-today.svg)

### `focus-band`

/focus inicia un bloque de foco con barra de progreso fija.

```
/plugin install focus-band@cockpit
```

![focus-band](docs/previews/focus-band.svg)

### `deadline-band`

/deadline fija una cuenta regresiva para el plazo del proyecto.

```
/plugin install deadline-band@cockpit
```

![deadline-band](docs/previews/deadline-band.svg)

### `pin-band`

/pin fija hasta 4 recordatorios del proyecto sobre el prompt.

```
/plugin install pin-band@cockpit
```

![pin-band](docs/previews/pin-band.svg)

### `clock-status`

Línea de estado con el día y la hora (útil en modo pantalla completa).

```
/plugin install clock-status@cockpit
```

![clock-status](docs/previews/clock-status.svg)

### `day-timer`

Línea de estado con tu tiempo activo de Claude Code en el día, sumando las sesiones.

```
/plugin install day-timer@cockpit
```

![day-timer](docs/previews/day-timer.svg)

### `commits-today`

Línea de estado con cuántos commits hiciste hoy en este repositorio.

```
/plugin install commits-today@cockpit
```

![commits-today](docs/previews/commits-today.svg)

### `dolar-status`

Línea de estado con la cotización del dólar en reales (AwesomeAPI).

```
/plugin install dolar-status@cockpit
```

![dolar-status](docs/previews/dolar-status.svg)

### `weather-status`

Línea de estado con el clima de tu ciudad (wttr.in).

```
/plugin install weather-status@cockpit
```

![weather-status](docs/previews/weather-status.svg)

### `api-status`

Status line con el estado de la API de Anthropic según su página pública de estado.

```
/plugin install api-status@cockpit
```

![api-status](docs/previews/api-status.svg)

### `terminal-pet`

Mascota sobre el prompt que reacciona: trabajando, feliz, triste o con sueño.

```
/plugin install terminal-pet@cockpit
```

![terminal-pet](docs/previews/terminal-pet.svg)

## Seguridad (14)

### `rm-guard`

Bloquea rm -rf y Remove-Item -Recurse en raíz, home y unidades, además de mkfs, dd y format.

```
/plugin install rm-guard@cockpit
```

![rm-guard](docs/previews/rm-guard.svg)

### `env-guard`

Protege los archivos .env contra lectura y escritura (Read, Edit, Write, cat y @mención).

```
/plugin install env-guard@cockpit
```

![env-guard](docs/previews/env-guard.svg)

### `git-guard`

Bloquea git destructivo: push --force, reset --hard, clean -f, --no-verify, branch -D.

```
/plugin install git-guard@cockpit
```

![git-guard](docs/previews/git-guard.svg)

### `secret-scan`

Rechaza Write/Edit cuyo contenido trae claves de API, tokens o claves privadas.

```
/plugin install secret-scan@cockpit
```

![secret-scan](docs/previews/secret-scan.svg)

### `prompt-secret-guard`

Impide el envío de prompts que contengan secretos pegados por error.

```
/plugin install prompt-secret-guard@cockpit
```

![prompt-secret-guard](docs/previews/prompt-secret-guard.svg)

### `lockfile-guard`

Impide la edición manual de lockfiles (package-lock, yarn.lock, pnpm-lock, Cargo.lock...).

```
/plugin install lockfile-guard@cockpit
```

![lockfile-guard](docs/previews/lockfile-guard.svg)

### `path-jail`

Restringe Write/Edit a la raíz del proyecto, al temp y a ~/.claude (resuelve symlinks).

```
/plugin install path-jail@cockpit
```

![path-jail](docs/previews/path-jail.svg)

### `main-branch-guard`

Rechaza commit, push, merge y rebase cuando la rama actual es main/master.

```
/plugin install main-branch-guard@cockpit
```

![main-branch-guard](docs/previews/main-branch-guard.svg)

### `generated-guard`

Impide la edición en node_modules, dist, build, .next, coverage, .git y similares.

```
/plugin install generated-guard@cockpit
```

![generated-guard](docs/previews/generated-guard.svg)

### `sql-guard`

Bloquea DROP, TRUNCATE y DELETE/UPDATE sin WHERE en comandos de shell.

```
/plugin install sql-guard@cockpit
```

![sql-guard](docs/previews/sql-guard.svg)

### `prod-guard`

Exige tu confirmación para deploy, publish, terraform apply, kubectl y migraciones.

```
/plugin install prod-guard@cockpit
```

![prod-guard](docs/previews/prod-guard.svg)

### `install-ask`

Exige tu confirmación siempre que Claude vaya a instalar una dependencia nueva.

```
/plugin install install-ask@cockpit
```

![install-ask](docs/previews/install-ask.svg)

### `pipe-shell-guard`

Bloquea curl | sh, wget | bash, iwr | iex y variantes.

```
/plugin install pipe-shell-guard@cockpit
```

![pipe-shell-guard](docs/previews/pipe-shell-guard.svg)

### `big-read-guard`

Rechaza leer entero un archivo de más de 512 KB y pide un fragmento.

```
/plugin install big-read-guard@cockpit
```

![big-read-guard](docs/previews/big-read-guard.svg)

## Interfaz (8)

### `turn-timer`

Banda sobre el prompt con duración, tools y tokens del último turno.

```
/plugin install turn-timer@cockpit
```

![turn-timer](docs/previews/turn-timer.svg)

### `tool-tally`

/tally abre un panel con el recuento de llamadas por herramienta.

```
/plugin install tool-tally@cockpit
```

![tool-tally](docs/previews/tool-tally.svg)

### `file-trail`

/trail abre un panel con los archivos leídos y modificados en la sesión.

```
/plugin install file-trail@cockpit
```

![file-trail](docs/previews/file-trail.svg)

### `cmd-log`

/cmdlog abre un panel con los comandos de shell, estado y duración.

```
/plugin install cmd-log@cockpit
```

![cmd-log](docs/previews/cmd-log.svg)

### `git-status-line`

Status line con rama, archivos modificados y commits por delante/detrás.

```
/plugin install git-status-line@cockpit
```

![git-status-line](docs/previews/git-status-line.svg)

### `context-meter`

Status line con barra de contexto y coste; avisa al 80% y 90%.

```
/plugin install context-meter@cockpit
```

![context-meter](docs/previews/context-meter.svg)

### `rate-limit-watch`

Toast cuando la ventana de 5h o 7 días supera 75/90/95%; /limits lista el uso.

```
/plugin install rate-limit-watch@cockpit
```

![rate-limit-watch](docs/previews/rate-limit-watch.svg)

### `session-clock`

Status line con tiempo de sesión y número de prompts.

```
/plugin install session-clock@cockpit
```

![session-clock](docs/previews/session-clock.svg)

## Prompt y modelo (8)

### `concise-mode`

/concise activa respuestas cortas y directas, sin introducción ni recapitulación.

```
/plugin install concise-mode@cockpit
```

![concise-mode](docs/previews/concise-mode.svg)

### `persona`

/persona cambia la voz de Claude: mentor, senior, rubberduck, pirata, yoda, zen.

```
/plugin install persona@cockpit
```

![persona](docs/previews/persona.svg)

### `prompt-shortcuts`

Los atajos ::fix, ::test, ::review, ::explain, ::refactor, ::doc, ::commit se vuelven prompts completos.

```
/plugin install prompt-shortcuts@cockpit
```

![prompt-shortcuts](docs/previews/prompt-shortcuts.svg)

### `tldr`

Añade un TL;DR de 2 frases (vía haiku) debajo de las respuestas largas.

```
/plugin install tldr@cockpit
```

![tldr](docs/previews/tldr.svg)

### `git-context`

Adjunta el estado de git (rama y archivos modificados) a cada prompt como contexto oculto.

```
/plugin install git-context@cockpit
```

![git-context](docs/previews/git-context.svg)

### `stack-context`

Detecta el stack del proyecto (package.json, pom.xml...) e informa a Claude en el system prompt.

```
/plugin install stack-context@cockpit
```

![stack-context](docs/previews/stack-context.svg)

### `commit-style`

Hace que Claude escriba commits en Conventional Commits, cortos y en imperativo.

```
/plugin install commit-style@cockpit
```

![commit-style](docs/previews/commit-style.svg)

### `reply-language`

Hace que Claude responda siempre en el idioma definido en el hub Cockpit, manteniendo código y comandos en el original.

```
/plugin install reply-language@cockpit
```

![reply-language](docs/previews/reply-language.svg)

## Comandos (6)

### `quick-notes`

/note y /notes: notas rápidas por proyecto, que se conservan entre sesiones.

```
/plugin install quick-notes@cockpit
```

![quick-notes](docs/previews/quick-notes.svg)

### `pomodoro`

/pomodoro [min] con cuenta atrás en la status line, toast y notificación al final.

```
/plugin install pomodoro@cockpit
```

![pomodoro](docs/previews/pomodoro.svg)

### `copy-last`

/copy-last copia la última respuesta; /copy-code copia el último bloque de código.

```
/plugin install copy-last@cockpit
```

![copy-last](docs/previews/copy-last.svg)

### `session-stats`

/stats resume la sesión: tiempo, prompts, tools, tokens, contexto y coste.

```
/plugin install session-stats@cockpit
```

![session-stats](docs/previews/session-stats.svg)

### `quote-selection`

/quote cita en el prompt el fragmento seleccionado con el ratón.

```
/plugin install quote-selection@cockpit
```

![quote-selection](docs/previews/quote-selection.svg)

### `git-peek`

/gs, /gl y /gd: status, log y diff de git al instante, sin gastar un turno del modelo.

```
/plugin install git-peek@cockpit
```

![git-peek](docs/previews/git-peek.svg)

## Foco y notificaciones (3)

### `turn-notify`

Notificación nativa cuando termina un turno de 30s o más.

```
/plugin install turn-notify@cockpit
```

![turn-notify](docs/previews/turn-notify.svg)

### `break-reminder`

Un toast cada 50 minutos de sesión que te recuerda hacer una pausa.

```
/plugin install break-reminder@cockpit
```

![break-reminder](docs/previews/break-reminder.svg)

### `daily-streak`

Cuenta tus días seguidos con Claude Code; un toast al abrir y el comando /streak.

```
/plugin install daily-streak@cockpit
```

![daily-streak](docs/previews/daily-streak.svg)


## Lenguaje visual

Todos los paneles se dibujan igual, para que varios juntos se lean como un solo instrumento:

- **Fila de instrumento:** riel de color, etiqueta de ancho fijo y valores. Apiladas, las franjas se alinean en columnas.
- **Un matiz por tema** en el riel: Git, Sesión, Proyecto y Día a día. Verde, ámbar y rojo quedan reservados para el estado de un valor.
- **Medidores de línea fina** (`━━━━───`) en lugar de barras de bloque.
- **Status line corta y en minúsculas:** `etiqueta estado detalle`, como `tests ✓ 14:32 · 3.1s`.
- Los colores vienen del tema de tu Claude Code. El dibujo vive en `kit/kit.tsx`, copiado a cada mod en el build.

## Conjuntos sugeridos

| Para | Mods |
| --- | --- |
| **Un panel para el día a día** | `git-band` `usage-band` `todo-band` `error-band` `test-status` |
| **Git sin sorpresas** | `git-band` `conflict-band` `uncommitted-band` `main-warning-band` `pr-status` `ci-status` |
| **Vigilar el gasto** | `usage-band` `cost-ticker` `spend-today` `reset-countdown` `compact-nudge` |
| **Cinturón de seguridad** | `rm-guard` `git-guard` `env-guard` `secret-scan` `pipe-shell-guard` `prod-guard` `shield-band` |
| **Menos tecleo** | `stack-context` `git-context` `commit-style` `prompt-shortcuts` `git-peek` |
| **Foco** | `focus-band` `deadline-band` `pin-band` `turn-notify` `break-reminder` |

## Antes de instalar

- **Los mods no están en sandbox.** Se ejecutan con el mismo alcance que Claude Code. Lee el `hooks/register.ts` del mod antes de instalarlo; todos aquí son cortos.
- **Los guards son un cinturón de seguridad, no una caja fuerte.** Detectan formas conocidas de comandos y rutas: un comando ofuscado puede pasar, y una ruta legítima puede ser rechazada. Mantén configurados los permisos de Claude Code.
- **Algunos guards preguntan en vez de bloquear.** `prod-guard`, `install-ask` y los demás que lo indican fuerzan la confirmación aunque el comando ya estuviera permitido.
- **Algunos mods llaman a un modelo** y gastan tokens; su descripción lo avisa.
- **Algunos paneles usan la red** y quedan ocultos cuando no hay respuesta: `dolar-status` (AwesomeAPI), `weather-status` (wttr.in, ubica por IP), `api-status` (página de estado de Anthropic), `ports-band` (solo `localhost`).
- **`ci-status` y `pr-status` necesitan `gh` autenticado.**
- **Los paneles de Git consultan el repositorio** cada 30 a 60 segundos.
- **Sin sonido.** En esta versión `$.audio.play` solo suena en macOS, así que las notificaciones usan el canal nativo.
- La API de mods es **early access** y puede cambiar entre versiones de Claude Code.

## Desarrollo

```bash
npm install
npm run build              # manifests, lista de paneles del hub, vistas previas y los tres README
npm run check              # tsc + claude plugin validate en cada mod + claude plugin test donde hay tests
node scripts/mod.mjs <mod> # el mismo ciclo para un mod, sin tocar los archivos compartidos
```

`mods.json` es la fuente única: nombre, categoría, descripciones en tres idiomas y las líneas de la vista previa de cada mod.

```
mods/<nombre>/
  hooks/register.ts(x)   el mod
  hooks/strings.ts       todo texto para el usuario, en en, pt y es
  types/index.d.ts       el contrato de $.state, en los mods que dibujan
  tests/                 ejecutados por `claude plugin test`
```

`plugin.json`, `hooks.json` y la copia del kit en cada mod se generan.

**Crear mods con el agente.** El repositorio incluye un agente de Claude Code, `cockpit-mod-builder` (`.claude/agents/`), que conoce las convenciones: el patrón de idiomas, el kit visual, las reglas del motor que más hacen tropezar y el ciclo de un mod. Abre Claude Code en el repositorio y pídelo por su nombre, indicando la categoría y los mods que quieres.

El type-check usa las declaraciones de la API que escribe el propio Claude Code. No están en el repositorio: ejecuta un mod con `claude --plugin-dir mods/<nombre>` y copia `mods/<nombre>/.claude-plugin/types/claude-code/index.d.ts` y `claude-code-tools/index.d.ts` a `engine-types/`.

## El ecosistema de mods

Relevamiento del 13/10/2026 con `gh api` y la documentación oficial. Las estrellas son de ese día.

- Anuncio: [claude.com/blog/claude-code-mods](https://claude.com/blog/claude-code-mods)
- Documentación: [code.claude.com/docs/en/plugins/mods/overview](https://code.claude.com/docs/en/plugins/mods/overview)
- Mods incluidos: [anthropics/claude-code/mods](https://github.com/anthropics/claude-code/tree/main/mods)
- Ejemplos oficiales: [anthropics/claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods)

| Colección de la comunidad | Estrellas | Conocida por |
| --- | --- | --- |
| [karanb192/awesome-claude-code-mods](https://github.com/karanb192/awesome-claude-code-mods) | 560 | Catálogo de 3.836 mods en 1.987 repositorios |
| [YeonwooSung/my-claude-code-mods](https://github.com/YeonwooSung/my-claude-code-mods) | 514 | agent-profiler, context-inspector, time-machine |
| [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods) | 227 | context-bar, blast-radius, merge-gate |
| [zenbu-labs/terminal-browser](https://github.com/zenbu-labs/terminal-browser) | 3.854 | Un navegador dentro de la terminal |
| [jarrodwatts/claude-image-view](https://github.com/jarrodwatts/claude-image-view) | 222 | Imágenes en la terminal |

Otras formas de personalizar Claude Code, que no son mods: [claude-hud](https://github.com/jarrodwatts/claude-hud) y [ccstatusline](https://github.com/sirmalloc/ccstatusline) (scripts de status line), [ccusage](https://github.com/ccusage/ccusage) (CLI sobre los transcripts), [tweakcc](https://github.com/Piebald-AI/tweakcc) (parchea la instalación), [cc-safety-net](https://github.com/kenryu42/cc-safety-net) (hook PreToolUse).

## Licencia

MIT
