# write-like-grant

Sound like Grant, not like an AI.

## The problem

A drafted reply that is grammatical, polite, and complete can still read as
machine-written. The tells are small: a greeting nobody uses, a hedge where a
plain sentence would do, an exclamation point missing from a happy note or
present in a delicate one. The person on the other end notices, and the draft
gets rewritten from scratch, which was the work the draft was supposed to save.

## What it does

The skill carries a compact profile of how Grant actually writes, built from
his own sent email and texts: the register dial from external email down to
friends-and-family texts, the greetings and sign-offs he really uses, his
punctuation habits, the words he reaches for and the ones he never would, and
seven worked examples across that range. Given a channel, a relationship, and
a purpose, it drafts in his voice at the right level of polish, and keeps it
shorter than you expect.

It is a personal skill. Installed by anyone else, it writes like Grant, which
is probably not what you want. The structure is a reasonable template for a
voice skill of your own, and the clone-my-voice skill that ships with Claude
Desktop builds one from your own messages.

## Install (Claude Code)

```
/plugin marketplace add glisom/skills
/plugin install write-like-grant@glisom
```

## Install (Codex, Gemini CLI, and other hosts)

From the repository root, copy `plugins/write-like-grant/skills/write-like-grant/` in full to
`~/.agents/skills/write-like-grant/` for Codex or Gemini CLI, or to your host's documented
skills directory. Include the bundled resources and `LICENSE.txt`. See the
[root installation guide](../../README.md#install-in-codex-or-gemini-cli) for
project scope, Windows commands, updates, and duplicate-install handling.

Ask the host to use `write-like-grant` by name. Codex CLI also supports `$write-like-grant`;
slash-command syntax varies by host. The same instruction files ship in the
Claude plugin and the standalone folder.

## Usage

```
Reply to this email as me.
Draft a thank-you to Sam for yesterday's meeting, in my voice.
Make this Slack message sound like me, and shorter.
```

The skill also fires on its own when Grant asks for help answering someone.
It does not apply to brand or marketing copy, where a personal voice is not
wanted.

## License

MIT. See [LICENSE](../../LICENSE).
