# Cockpit

**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

**An instrument panel for Claude Code.** 112 mods for the terminal: 40 panels that stay in sight and switch on and off in `/cockpit`, plus guards, prompt automations, instant commands and focus helpers. Every mod is a small plugin you install with one line.

![The full Cockpit panel in a terminal](docs/cockpit.svg)

```
/plugin marketplace add MatheusChiodi/cockpit
/plugin install git-band@cockpit
/cockpit
```

> Mods are TypeScript functions that run inside Claude Code and change how it behaves: they intercept tool calls, rewrite prompts, draw panes and bands, and register slash commands. They need Claude Code **2.1.287 or newer** (built against 2.1.296).

## Install

**From GitHub**, inside Claude Code:

```
/plugin marketplace add MatheusChiodi/cockpit
/plugin install <mod>@cockpit
```

**From a local folder:**

```bash
git clone https://github.com/MatheusChiodi/cockpit
claude plugin marketplace add ./cockpit
claude plugin install git-guard@cockpit
```

**Just to try one**, without installing:

```bash
claude --plugin-dir ./cockpit/mods/turn-timer
```

Remove a mod with `/plugin uninstall <mod>@cockpit`. Turn every mod off at once with `claude --safe-mode`.

## Panels and settings

The 40 mods under **Always visible** are panels: bands above the prompt or status line entries that update on their own (git, context, cost, tests, CI, tasks, deadline, weather). None needs a command to show up.

The `cockpit` mod is their settings pane, and it comes along as a dependency of any panel.

| To | Do |
| --- | --- |
| Open the settings pane | `/cockpit` — Tab and arrows move, Enter or a click toggles, Esc closes |
| Switch a panel off or on | `/cockpit off git-band` · `/cockpit on git-band` |
| Switch all of them | `/cockpit off all` · `/cockpit on all` |
| Change the language | `/cockpit lang en` · `/cockpit lang pt` · `/cockpit lang es` |

Both choices are kept between sessions. A band disappears or returns at once; a status line entry disappears at once and returns on its next update. A panel switched off stays installed and simply does not draw.

Bands stack in the order the mods load, and the status line holds one entry per mod. With many panels on, the terminal gets crowded: start with four or five and adjust in `/cockpit`.

## Language

Every mod speaks **English** by default and can switch to **Brazilian Portuguese** or **Spanish**. The language is set once, in `/cockpit`, and every installed mod follows it: band labels, status line words, command output, guard messages, toasts and notifications. Without the `cockpit` mod installed, mods stay in English.

Slash command descriptions in the typeahead are read when a session starts, so they follow a language change on the next session. To make Claude itself answer in the chosen language, install `reply-language`.

## Catalog

| | | |
| --- | --- | --- |
| [**Always visible**](docs/catalog/panel.md) | 41 | `cockpit` `git-band` `todo-band` `usage-band` `files-band` `error-band` `goal-band` `agents-band` `activity-status` `test-status` `ci-status` `stash-status` `uncommitted-band` `pr-status` `main-warning-band` `conflict-band` `project-status` `ports-band` `deps-status` `todo-count-status` `quality-status` `model-status` `cost-ticker` `idle-clock` `turn-progress` `last-prompt-band` `compact-nudge` `session-diff-band` `shield-band` `reset-countdown` `spend-today` `focus-band` `deadline-band` `pin-band` `clock-status` `day-timer` `commits-today` `dolar-status` `weather-status` `api-status` `terminal-pet` |
| [**Security**](docs/catalog/security.md) | 14 | `rm-guard` `env-guard` `git-guard` `secret-scan` `prompt-secret-guard` `lockfile-guard` `path-jail` `main-branch-guard` `generated-guard` `sql-guard` `prod-guard` `install-ask` `pipe-shell-guard` `big-read-guard` |
| [**Interface**](docs/catalog/interface.md) | 8 | `turn-timer` `tool-tally` `file-trail` `cmd-log` `git-status-line` `context-meter` `rate-limit-watch` `session-clock` |
| [**Prompt and model**](docs/catalog/prompt.md) | 8 | `concise-mode` `persona` `prompt-shortcuts` `tldr` `git-context` `stack-context` `commit-style` `reply-language` |
| [**Commands**](docs/catalog/commands.md) | 30 | `quick-notes` `pomodoro` `copy-last` `session-stats` `quote-selection` `git-peek` `git-branch` `git-stash` `git-undo` `run-script` `open-path` `ports` `kill-port` `tree` `find-file` `last-error` `env-check` `outdated` `json-tool` `uuid` `timestamp` `base64` `hash` `calc` `color-tool` `regex-test` `http-probe` `snippets` `export-session` `standup` |
| [**Focus and notifications**](docs/catalog/focus.md) | 11 | `turn-notify` `break-reminder` `daily-streak` `error-notify` `needs-you-notify` `agent-done-notify` `long-cmd-notify` `tests-notify` `ci-notify` `pr-review-notify` `rate-limit-notify` |
| [**Git and GitHub**](docs/catalog/git.md) | 0 |  |
| [**Quality**](docs/catalog/quality.md) | 0 |  |
| [**Stacks**](docs/catalog/stack.md) | 0 |  |
| [**Context and cost**](docs/catalog/context.md) | 0 |  |

## Visual language

Every panel is drawn the same way, so several of them read as one instrument:

- **Instrument row:** a colored rail, a fixed-width label, then values. Stacked, the bands line up in columns.
- **One hue per subject** on the rail: Git, Session, Project and Daily. Green, amber and red are reserved for the state of a value.
- **Thin-line gauges** (`━━━━───`) instead of block bars.
- **A short, lowercase status line:** `label state detail`, as in `tests ✓ 14:32 · 3.1s`.
- Colors come from your Claude Code theme. The drawing lives in `kit/kit.tsx`, copied into each mod at build time.

## Suggested sets

| For | Mods |
| --- | --- |
| **An everyday dashboard** | `git-band` `usage-band` `todo-band` `error-band` `test-status` |
| **Git without surprises** | `git-band` `conflict-band` `uncommitted-band` `main-warning-band` `pr-status` `ci-status` |
| **An eye on spend** | `usage-band` `cost-ticker` `spend-today` `reset-countdown` `compact-nudge` |
| **A seat belt** | `rm-guard` `git-guard` `env-guard` `secret-scan` `pipe-shell-guard` `prod-guard` `shield-band` |
| **Less typing** | `stack-context` `git-context` `commit-style` `prompt-shortcuts` `git-peek` |
| **Focus** | `focus-band` `deadline-band` `pin-band` `turn-notify` `break-reminder` |

## Before you install

- **Mods are not sandboxed.** They run with the same reach as Claude Code. Read a mod's `hooks/register.ts` before installing it; every one here is short.
- **Guards are a seat belt, not a vault.** They match known shapes of commands and paths: an obfuscated command can get through, and a legitimate path can be refused. Keep Claude Code's own permissions configured.
- **Some guards ask instead of blocking.** `prod-guard`, `install-ask` and the others that say so force the confirmation prompt even when the command was already allowed.
- **A few mods call a model** and cost tokens; their description says so.
- **Some panels use the network** and stay hidden when there is no answer: `dolar-status` (AwesomeAPI), `weather-status` (wttr.in, located by IP), `api-status` (Anthropic's status page), `ports-band` (`localhost` only).
- **`ci-status` and `pr-status` need an authenticated `gh`.**
- **Git panels poll the repository** every 30 to 60 seconds.
- **No sound.** In this version `$.audio.play` only plays on macOS, so notifications use the native channel.
- The mods API is **early access** and may change between Claude Code releases.

## Development

```bash
npm install
npm run build              # manifests, the hub's panel list, previews and the three READMEs
npm run check              # tsc + claude plugin validate on every mod + claude plugin test where tests exist
node scripts/mod.mjs <mod> # the same loop for one mod, without touching shared files
```

`mods.json` is the single source: name, category, descriptions in three languages and the preview lines of every mod.

```
mods/<name>/
  hooks/register.ts(x)   the mod
  hooks/strings.ts       every user-facing text, in en, pt and es
  types/index.d.ts       the $.state contract, for mods that draw
  tests/                 run by `claude plugin test`
```

`plugin.json`, `hooks.json` and each mod's copy of the kit are generated.

**Adding mods with the agent.** The repository ships a Claude Code agent, `cockpit-mod-builder` (`.claude/agents/`), that knows the conventions: the language pattern, the visual kit, the engine rules that trip people up, and the one-mod loop. Open Claude Code in the repository and ask for it by name, giving a category and the mods you want.

The type check uses the API declarations Claude Code itself writes. They are not in the repository: run a mod with `claude --plugin-dir mods/<name>` and copy `mods/<name>/.claude-plugin/types/claude-code/index.d.ts` plus `claude-code-tools/index.d.ts` into `engine-types/`.

## The mods ecosystem

Surveyed on 2026-10-13 through `gh api` and the official documentation. Star counts are from that day.

- Announcement: [claude.com/blog/claude-code-mods](https://claude.com/blog/claude-code-mods)
- Documentation: [code.claude.com/docs/en/plugins/mods/overview](https://code.claude.com/docs/en/plugins/mods/overview)
- Built-in mods: [anthropics/claude-code/mods](https://github.com/anthropics/claude-code/tree/main/mods)
- Official samples: [anthropics/claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods)

| Community collection | Stars | Known for |
| --- | --- | --- |
| [karanb192/awesome-claude-code-mods](https://github.com/karanb192/awesome-claude-code-mods) | 560 | A catalog of 3,836 mods across 1,987 repositories |
| [YeonwooSung/my-claude-code-mods](https://github.com/YeonwooSung/my-claude-code-mods) | 514 | agent-profiler, context-inspector, time-machine |
| [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods) | 227 | context-bar, blast-radius, merge-gate |
| [zenbu-labs/terminal-browser](https://github.com/zenbu-labs/terminal-browser) | 3,854 | A browser inside the terminal |
| [jarrodwatts/claude-image-view](https://github.com/jarrodwatts/claude-image-view) | 222 | Images in the terminal |

Other ways people customize Claude Code, which are not mods: [claude-hud](https://github.com/jarrodwatts/claude-hud) and [ccstatusline](https://github.com/sirmalloc/ccstatusline) (status line scripts), [ccusage](https://github.com/ccusage/ccusage) (a CLI over the transcripts), [tweakcc](https://github.com/Piebald-AI/tweakcc) (patches the install), [cc-safety-net](https://github.com/kenryu42/cc-safety-net) (a PreToolUse hook).

## License

MIT
