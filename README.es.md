# Cockpit

[English](README.md) · [Português](README.pt-BR.md) · **Español**

**Un panel de instrumentos para Claude Code.** 137 mods para la terminal: 40 paneles que quedan siempre a la vista y se activan o desactivan en `/cockpit`, además de guards, automatizaciones de prompt, comandos instantáneos y ayudas de foco. Cada mod es un plugin pequeño que se instala con una línea.

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

| | | |
| --- | --- | --- |
| [**Siempre visible**](docs/catalog/panel.es.md) | 41 | `cockpit` `git-band` `todo-band` `usage-band` `files-band` `error-band` `goal-band` `agents-band` `activity-status` `test-status` `ci-status` `stash-status` `uncommitted-band` `pr-status` `main-warning-band` `conflict-band` `project-status` `ports-band` `deps-status` `todo-count-status` `quality-status` `model-status` `cost-ticker` `idle-clock` `turn-progress` `last-prompt-band` `compact-nudge` `session-diff-band` `shield-band` `reset-countdown` `spend-today` `focus-band` `deadline-band` `pin-band` `clock-status` `day-timer` `commits-today` `dolar-status` `weather-status` `api-status` `terminal-pet` |
| [**Seguridad**](docs/catalog/security.es.md) | 14 | `rm-guard` `env-guard` `git-guard` `secret-scan` `prompt-secret-guard` `lockfile-guard` `path-jail` `main-branch-guard` `generated-guard` `sql-guard` `prod-guard` `install-ask` `pipe-shell-guard` `big-read-guard` |
| [**Interfaz**](docs/catalog/interface.es.md) | 20 | `turn-timer` `tool-tally` `file-trail` `cmd-log` `git-status-line` `context-meter` `rate-limit-watch` `session-clock` `diff-pane` `turn-history` `prompt-history` `agent-pane` `token-chart` `cost-pane` `error-pane` `context-pane` `read-pane` `links-pane` `git-pane` `branch-pane` |
| [**Prompt y modelo**](docs/catalog/prompt.es.md) | 8 | `concise-mode` `persona` `prompt-shortcuts` `tldr` `git-context` `stack-context` `commit-style` `reply-language` |
| [**Comandos**](docs/catalog/commands.es.md) | 30 | `quick-notes` `pomodoro` `copy-last` `session-stats` `quote-selection` `git-peek` `git-branch` `git-stash` `git-undo` `run-script` `open-path` `ports` `kill-port` `tree` `find-file` `last-error` `env-check` `outdated` `json-tool` `uuid` `timestamp` `base64` `hash` `calc` `color-tool` `regex-test` `http-probe` `snippets` `export-session` `standup` |
| [**Foco y notificaciones**](docs/catalog/focus.es.md) | 24 | `turn-notify` `break-reminder` `daily-streak` `error-notify` `needs-you-notify` `agent-done-notify` `long-cmd-notify` `tests-notify` `ci-notify` `pr-review-notify` `rate-limit-notify` `hydrate` `posture` `eye-rest` `stand-up` `alarms` `remind` `timebox` `session-cap` `late-night` `intent-check` `daily-target` `weekly-recap` `breathe` |
| [**Git y GitHub**](docs/catalog/git.es.md) | 0 |  |
| [**Calidad**](docs/catalog/quality.es.md) | 0 |  |
| [**Stacks**](docs/catalog/stack.es.md) | 0 |  |
| [**Contexto y costo**](docs/catalog/context.es.md) | 0 |  |

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
