# decide

One decision at a time, three options, one recommended.

## The problem

Partway through a task, the choices only the user can make pile up: which of
two libraries, whether to keep or drop a feature, what to name the thing. The
usual failure is a wall of questions at the end, or worse, a string of silent
guesses. Both cost the same attention the questions were meant to protect.

## What it does

The skill collects every open decision from the current context, drops the
ones with an obvious default (and says so at the end), orders the rest so
blocking decisions and prerequisites come first, and then asks exactly one per
turn. Each question offers three options with the recommended one marked and
a sentence on what each costs. A free-text answer is taken as final. It closes
with a compact summary of every answer and every default it chose on its own.

When the harness offers a structured question tool, the skill uses it.
Otherwise it asks in plain text with the same shape. An asynchronous question stays pending until the user actually answers; the skill respects tools restricted to a particular host mode.

It was written for Grant's workflow and says so in its prose. The procedure
itself is general.

## Install (Claude Code)

```
/plugin marketplace add glisom/skills
/plugin install decide@glisom
```

Once installed, `/decide` invokes it directly.

## Install (Codex, Gemini CLI, and other hosts)

From the repository root, copy `plugins/decide/skills/decide/` in full to
`~/.agents/skills/decide/` for Codex or Gemini CLI, or to your host's documented
skills directory. Include the bundled resources and `LICENSE.txt`. See the
[root installation guide](../../README.md#install-in-codex-or-gemini-cli) for
project scope, Windows commands, updates, and duplicate-install handling.

Ask the host to use `decide` by name. Codex CLI also supports `$decide`;
slash-command syntax varies by host. The same instruction files ship in the
Claude plugin and the standalone folder.

## Usage

```
/decide
Go through the open decisions with me.
Before you build this, what do you need me to decide?
```

## License

MIT. See [LICENSE](../../LICENSE).
