# Cockpit

**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

**An instrument panel for Claude Code.** 83 mods for the terminal: 40 panels that stay in sight and switch on and off in `/cockpit`, plus guards, prompt automations, instant commands and focus helpers. Every mod is a small plugin you install with one line.

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

| | |
| --- | --- |
| **Always visible** (41) | [`cockpit`](#cockpit) · [`git-band`](#git-band) · [`todo-band`](#todo-band) · [`usage-band`](#usage-band) · [`files-band`](#files-band) · [`error-band`](#error-band) · [`goal-band`](#goal-band) · [`agents-band`](#agents-band) · [`activity-status`](#activity-status) · [`test-status`](#test-status) · [`ci-status`](#ci-status) · [`stash-status`](#stash-status) · [`uncommitted-band`](#uncommitted-band) · [`pr-status`](#pr-status) · [`main-warning-band`](#main-warning-band) · [`conflict-band`](#conflict-band) · [`project-status`](#project-status) · [`ports-band`](#ports-band) · [`deps-status`](#deps-status) · [`todo-count-status`](#todo-count-status) · [`quality-status`](#quality-status) · [`model-status`](#model-status) · [`cost-ticker`](#cost-ticker) · [`idle-clock`](#idle-clock) · [`turn-progress`](#turn-progress) · [`last-prompt-band`](#last-prompt-band) · [`compact-nudge`](#compact-nudge) · [`session-diff-band`](#session-diff-band) · [`shield-band`](#shield-band) · [`reset-countdown`](#reset-countdown) · [`spend-today`](#spend-today) · [`focus-band`](#focus-band) · [`deadline-band`](#deadline-band) · [`pin-band`](#pin-band) · [`clock-status`](#clock-status) · [`day-timer`](#day-timer) · [`commits-today`](#commits-today) · [`dolar-status`](#dolar-status) · [`weather-status`](#weather-status) · [`api-status`](#api-status) · [`terminal-pet`](#terminal-pet) |
| **Security** (14) | [`rm-guard`](#rm-guard) · [`env-guard`](#env-guard) · [`git-guard`](#git-guard) · [`secret-scan`](#secret-scan) · [`prompt-secret-guard`](#prompt-secret-guard) · [`lockfile-guard`](#lockfile-guard) · [`path-jail`](#path-jail) · [`main-branch-guard`](#main-branch-guard) · [`generated-guard`](#generated-guard) · [`sql-guard`](#sql-guard) · [`prod-guard`](#prod-guard) · [`install-ask`](#install-ask) · [`pipe-shell-guard`](#pipe-shell-guard) · [`big-read-guard`](#big-read-guard) |
| **Interface** (8) | [`turn-timer`](#turn-timer) · [`tool-tally`](#tool-tally) · [`file-trail`](#file-trail) · [`cmd-log`](#cmd-log) · [`git-status-line`](#git-status-line) · [`context-meter`](#context-meter) · [`rate-limit-watch`](#rate-limit-watch) · [`session-clock`](#session-clock) |
| **Prompt and model** (8) | [`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) · [`reply-language`](#reply-language) |
| **Commands** (9) | [`quick-notes`](#quick-notes) · [`pomodoro`](#pomodoro) · [`copy-last`](#copy-last) · [`session-stats`](#session-stats) · [`quote-selection`](#quote-selection) · [`git-peek`](#git-peek) · [`git-branch`](#git-branch) · [`git-stash`](#git-stash) · [`git-undo`](#git-undo) |
| **Focus and notifications** (3) | [`turn-notify`](#turn-notify) · [`break-reminder`](#break-reminder) · [`daily-streak`](#daily-streak) |

## Always visible (41)

### `cockpit`

Settings pane: /cockpit switches each panel on and off and sets the language of every mod.

```
/plugin install cockpit@cockpit
```

![cockpit](docs/previews/cockpit.svg)

### `git-band`

Band with the branch, changed files, lines added and removed, ahead/behind and the last commit.

```
/plugin install git-band@cockpit
```

![git-band](docs/previews/git-band.svg)

### `todo-band`

Project task list pinned above the prompt, clickable and persistent (/todo).

```
/plugin install todo-band@cockpit
```

![todo-band](docs/previews/todo-band.svg)

### `usage-band`

Fixed band with colored bars for context, the 5h and 7 day windows, and cost.

```
/plugin install usage-band@cockpit
```

![usage-band](docs/previews/usage-band.svg)

### `files-band`

Fixed band with the files Claude changed in this session.

```
/plugin install files-band@cockpit
```

![files-band](docs/previews/files-band.svg)

### `error-band`

Keeps the last failed command and its error line in view until a command passes.

```
/plugin install error-band@cockpit
```

![error-band](docs/previews/error-band.svg)

### `goal-band`

/goal pins the project goal above the prompt and in Claude's context.

```
/plugin install goal-band@cockpit
```

![goal-band](docs/previews/goal-band.svg)

### `agents-band`

Band showing in real time how many subagents are running and which ones.

```
/plugin install agents-band@cockpit
```

![agents-band](docs/previews/agents-band.svg)

### `activity-status`

Live status line with the tool Claude is running right now.

```
/plugin install activity-status@cockpit
```

![activity-status](docs/previews/activity-status.svg)

### `test-status`

Status line entry with the result of the last test run: passed or failed, time and duration.

```
/plugin install test-status@cockpit
```

![test-status](docs/previews/test-status.svg)

### `ci-status`

Status line with the state of the last GitHub Actions workflow (via gh).

```
/plugin install ci-status@cockpit
```

![ci-status](docs/previews/ci-status.svg)

### `stash-status`

Status line that reminds you how many stashes are saved.

```
/plugin install stash-status@cockpit
```

![stash-status](docs/previews/stash-status.svg)

### `uncommitted-band`

Warning band when changes have gone uncommitted for more than 45 minutes.

```
/plugin install uncommitted-band@cockpit
```

![uncommitted-band](docs/previews/uncommitted-band.svg)

### `pr-status`

Status line with the current branch pull request and its review state (via gh).

```
/plugin install pr-status@cockpit
```

![pr-status](docs/previews/pr-status.svg)

### `main-warning-band`

Red band while you are on main or master.

```
/plugin install main-warning-band@cockpit
```

![main-warning-band](docs/previews/main-warning-band.svg)

### `conflict-band`

Band that warns about a merge or rebase in progress and files in conflict.

```
/plugin install conflict-band@cockpit
```

![conflict-band](docs/previews/conflict-band.svg)

### `project-status`

Status line with the project name and version, Node version and package manager.

```
/plugin install project-status@cockpit
```

![project-status](docs/previews/project-status.svg)

### `ports-band`

Band with the dev servers running on localhost.

```
/plugin install ports-band@cockpit
```

![ports-band](docs/previews/ports-band.svg)

### `deps-status`

Status line with how many npm dependencies are outdated.

```
/plugin install deps-status@cockpit
```

![deps-status](docs/previews/deps-status.svg)

### `todo-count-status`

Status line counting TODO, FIXME and HACK in tracked code.

```
/plugin install todo-count-status@cockpit
```

![todo-count-status](docs/previews/todo-count-status.svg)

### `quality-status`

Status line with the latest lint, types and build results.

```
/plugin install quality-status@cockpit
```

![quality-status](docs/previews/quality-status.svg)

### `model-status`

Status line with the model in use in the session.

```
/plugin install model-status@cockpit
```

![model-status](docs/previews/model-status.svg)

### `cost-ticker`

Status line with the cost of the last turn and the session total.

```
/plugin install cost-ticker@cockpit
```

![cost-ticker](docs/previews/cost-ticker.svg)

### `idle-clock`

Status line with how long the session has been idle.

```
/plugin install idle-clock@cockpit
```

![idle-clock](docs/previews/idle-clock.svg)

### `turn-progress`

Live status line with the elapsed time and tool count of the turn in progress.

```
/plugin install turn-progress@cockpit
```

![turn-progress](docs/previews/turn-progress.svg)

### `last-prompt-band`

Band with your last request, so you do not lose it after long answers.

```
/plugin install last-prompt-band@cockpit
```

![last-prompt-band](docs/previews/last-prompt-band.svg)

### `compact-nudge`

Band with a compact button when context passes 75%.

```
/plugin install compact-nudge@cockpit
```

![compact-nudge](docs/previews/compact-nudge.svg)

### `session-diff-band`

Band with the total lines Claude wrote and removed in the session.

```
/plugin install session-diff-band@cockpit
```

![session-diff-band](docs/previews/session-diff-band.svg)

### `shield-band`

Band with the count of calls blocked by guards and the last reason.

```
/plugin install shield-band@cockpit
```

![shield-band](docs/previews/shield-band.svg)

### `reset-countdown`

Status line counting down to the reset of the tightest rate limit.

```
/plugin install reset-countdown@cockpit
```

![reset-countdown](docs/previews/reset-countdown.svg)

### `spend-today`

Status line with today's spend summed across all sessions.

```
/plugin install spend-today@cockpit
```

![spend-today](docs/previews/spend-today.svg)

### `focus-band`

/focus starts a focus block with a pinned progress bar.

```
/plugin install focus-band@cockpit
```

![focus-band](docs/previews/focus-band.svg)

### `deadline-band`

/deadline pins a countdown to the project deadline.

```
/plugin install deadline-band@cockpit
```

![deadline-band](docs/previews/deadline-band.svg)

### `pin-band`

/pin pins up to 4 project reminders above the prompt.

```
/plugin install pin-band@cockpit
```

![pin-band](docs/previews/pin-band.svg)

### `clock-status`

Status line with the day and time (useful in fullscreen mode).

```
/plugin install clock-status@cockpit
```

![clock-status](docs/previews/clock-status.svg)

### `day-timer`

Status line with your active Claude Code time today, summed across sessions.

```
/plugin install day-timer@cockpit
```

![day-timer](docs/previews/day-timer.svg)

### `commits-today`

Status line with how many commits you made today in this repository.

```
/plugin install commits-today@cockpit
```

![commits-today](docs/previews/commits-today.svg)

### `dolar-status`

Status line with the dollar rate in Brazilian reais (AwesomeAPI).

```
/plugin install dolar-status@cockpit
```

![dolar-status](docs/previews/dolar-status.svg)

### `weather-status`

Status line with the weather in your city (wttr.in).

```
/plugin install weather-status@cockpit
```

![weather-status](docs/previews/weather-status.svg)

### `api-status`

Status line with the state of the Anthropic API from its public status page.

```
/plugin install api-status@cockpit
```

![api-status](docs/previews/api-status.svg)

### `terminal-pet`

A mascot above the prompt that reacts: working, happy, sad or sleepy.

```
/plugin install terminal-pet@cockpit
```

![terminal-pet](docs/previews/terminal-pet.svg)

## Security (14)

### `rm-guard`

Blocks rm -rf and Remove-Item -Recurse on root, home and drives, plus mkfs, dd and format.

```
/plugin install rm-guard@cockpit
```

![rm-guard](docs/previews/rm-guard.svg)

### `env-guard`

Protects .env files from reading and writing (Read, Edit, Write, cat and @mention).

```
/plugin install env-guard@cockpit
```

![env-guard](docs/previews/env-guard.svg)

### `git-guard`

Blocks destructive git: push --force, reset --hard, clean -f, --no-verify, branch -D.

```
/plugin install git-guard@cockpit
```

![git-guard](docs/previews/git-guard.svg)

### `secret-scan`

Refuses Write/Edit whose content carries API keys, tokens or private keys.

```
/plugin install secret-scan@cockpit
```

![secret-scan](docs/previews/secret-scan.svg)

### `prompt-secret-guard`

Stops prompts that contain secrets pasted by mistake from being sent.

```
/plugin install prompt-secret-guard@cockpit
```

![prompt-secret-guard](docs/previews/prompt-secret-guard.svg)

### `lockfile-guard`

Prevents hand edits to lockfiles (package-lock, yarn.lock, pnpm-lock, Cargo.lock...).

```
/plugin install lockfile-guard@cockpit
```

![lockfile-guard](docs/previews/lockfile-guard.svg)

### `path-jail`

Restricts Write/Edit to the project root, the temp folder and ~/.claude (resolves symlinks).

```
/plugin install path-jail@cockpit
```

![path-jail](docs/previews/path-jail.svg)

### `main-branch-guard`

Refuses commit, push, merge and rebase while the current branch is main/master.

```
/plugin install main-branch-guard@cockpit
```

![main-branch-guard](docs/previews/main-branch-guard.svg)

### `generated-guard`

Prevents edits in node_modules, dist, build, .next, coverage, .git and the like.

```
/plugin install generated-guard@cockpit
```

![generated-guard](docs/previews/generated-guard.svg)

### `sql-guard`

Blocks DROP, TRUNCATE and DELETE/UPDATE without WHERE in shell commands.

```
/plugin install sql-guard@cockpit
```

![sql-guard](docs/previews/sql-guard.svg)

### `prod-guard`

Requires your confirmation for deploys, publishes, terraform apply, kubectl and migrations.

```
/plugin install prod-guard@cockpit
```

![prod-guard](docs/previews/prod-guard.svg)

### `install-ask`

Requires your confirmation whenever Claude is about to install a new dependency.

```
/plugin install install-ask@cockpit
```

![install-ask](docs/previews/install-ask.svg)

### `pipe-shell-guard`

Blocks curl | sh, wget | bash, iwr | iex and variants.

```
/plugin install pipe-shell-guard@cockpit
```

![pipe-shell-guard](docs/previews/pipe-shell-guard.svg)

### `big-read-guard`

Refuses reading a file over 512 KB whole and asks for a slice.

```
/plugin install big-read-guard@cockpit
```

![big-read-guard](docs/previews/big-read-guard.svg)

## Interface (8)

### `turn-timer`

Band above the prompt with duration, tools and tokens of the last turn.

```
/plugin install turn-timer@cockpit
```

![turn-timer](docs/previews/turn-timer.svg)

### `tool-tally`

/tally opens a pane with the call count per tool.

```
/plugin install tool-tally@cockpit
```

![tool-tally](docs/previews/tool-tally.svg)

### `file-trail`

/trail opens a pane with the files read and changed in the session.

```
/plugin install file-trail@cockpit
```

![file-trail](docs/previews/file-trail.svg)

### `cmd-log`

/cmdlog opens a pane with the shell commands, status and duration.

```
/plugin install cmd-log@cockpit
```

![cmd-log](docs/previews/cmd-log.svg)

### `git-status-line`

Status line with branch, changed files and commits ahead/behind.

```
/plugin install git-status-line@cockpit
```

![git-status-line](docs/previews/git-status-line.svg)

### `context-meter`

Status line with a context bar and cost; warns at 80% and 90%.

```
/plugin install context-meter@cockpit
```

![context-meter](docs/previews/context-meter.svg)

### `rate-limit-watch`

Toast when the 5h or 7-day window passes 75/90/95%; /limits lists the usage.

```
/plugin install rate-limit-watch@cockpit
```

![rate-limit-watch](docs/previews/rate-limit-watch.svg)

### `session-clock`

Status line with session time and number of prompts.

```
/plugin install session-clock@cockpit
```

![session-clock](docs/previews/session-clock.svg)

## Prompt and model (8)

### `concise-mode`

/concise turns on short, direct answers, with no introduction or recap.

```
/plugin install concise-mode@cockpit
```

![concise-mode](docs/previews/concise-mode.svg)

### `persona`

/persona changes Claude's voice: mentor, senior, rubberduck, pirata, yoda, zen.

```
/plugin install persona@cockpit
```

![persona](docs/previews/persona.svg)

### `prompt-shortcuts`

Shortcuts ::fix, ::test, ::review, ::explain, ::refactor, ::doc, ::commit become full prompts.

```
/plugin install prompt-shortcuts@cockpit
```

![prompt-shortcuts](docs/previews/prompt-shortcuts.svg)

### `tldr`

Adds a 2-sentence TL;DR (via haiku) below long answers.

```
/plugin install tldr@cockpit
```

![tldr](docs/previews/tldr.svg)

### `git-context`

Attaches the git state (branch and changed files) to every prompt as hidden context.

```
/plugin install git-context@cockpit
```

![git-context](docs/previews/git-context.svg)

### `stack-context`

Detects the project stack (package.json, pom.xml...) and tells Claude in the system prompt.

```
/plugin install stack-context@cockpit
```

![stack-context](docs/previews/stack-context.svg)

### `commit-style`

Makes Claude write short, imperative Conventional Commits.

```
/plugin install commit-style@cockpit
```

![commit-style](docs/previews/commit-style.svg)

### `reply-language`

Makes Claude always answer in the language set in the Cockpit hub, keeping code and commands in the original.

```
/plugin install reply-language@cockpit
```

![reply-language](docs/previews/reply-language.svg)

## Commands (9)

### `quick-notes`

/note and /notes: quick notes per project, kept between sessions.

```
/plugin install quick-notes@cockpit
```

![quick-notes](docs/previews/quick-notes.svg)

### `pomodoro`

/pomodoro [min] with a countdown in the status line, toast and notification at the end.

```
/plugin install pomodoro@cockpit
```

![pomodoro](docs/previews/pomodoro.svg)

### `copy-last`

/copy-last copies the last reply; /copy-code copies the last code block.

```
/plugin install copy-last@cockpit
```

![copy-last](docs/previews/copy-last.svg)

### `session-stats`

/stats sums up the session: time, prompts, tools, tokens, context and cost.

```
/plugin install session-stats@cockpit
```

![session-stats](docs/previews/session-stats.svg)

### `quote-selection`

/quote quotes in the prompt the passage selected with the mouse.

```
/plugin install quote-selection@cockpit
```

![quote-selection](docs/previews/quote-selection.svg)

### `git-peek`

/gs, /gl and /gd: git status, log and diff right away, without spending a model turn.

```
/plugin install git-peek@cockpit
```

![git-peek](docs/previews/git-peek.svg)

### `git-branch`

/gb lists local branches with the current one marked, or switches to a branch and creates it when missing.

```
/plugin install git-branch@cockpit
```

![git-branch](docs/previews/git-branch.svg)

### `git-stash`

/gst stashes the working tree with a message, pops the latest stash after asking, or lists the stashes.

```
/plugin install git-stash@cockpit
```

![git-stash](docs/previews/git-stash.svg)

### `git-undo`

/gundo shows the last commit and, once you confirm, undoes it with a soft reset; refuses a pushed commit.

```
/plugin install git-undo@cockpit
```

![git-undo](docs/previews/git-undo.svg)

## Focus and notifications (3)

### `turn-notify`

Native notification when a turn of 30s or more finishes.

```
/plugin install turn-notify@cockpit
```

![turn-notify](docs/previews/turn-notify.svg)

### `break-reminder`

A toast every 50 minutes of session reminding you to take a break.

```
/plugin install break-reminder@cockpit
```

![break-reminder](docs/previews/break-reminder.svg)

### `daily-streak`

Counts your streak of days using Claude Code; a toast on start and the /streak command.

```
/plugin install daily-streak@cockpit
```

![daily-streak](docs/previews/daily-streak.svg)


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
