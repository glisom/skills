---
name: decide
description: Walk Grant through every open decision one at a time with three options (one recommended). Use when he says /decide, asks to go through decisions, wants options for open questions, or a task has several choices only he can make.
---

# Decide

Grant uses this when a task has piled up choices that only he can make. He does not want a wall of questions. He wants one decision at a time, each with a small set of clear options, so he can move fast and stay in control.

## Collect the decisions

First, gather every open decision from the current context: the conversation so far, the plan or design under discussion, anything you flagged as "needs input", and anything you were about to guess at. Then trim the list.

Keep only decisions that are actually his to make. If a choice has an obvious default that no reasonable person would object to, do not ask; make the call and mention it in the summary at the end. Asking about trivia wastes the same attention this skill is meant to protect.

Order the list so blocking decisions come first, and so a decision comes before any decision that depends on it. If two decisions are really one (they always move together), merge them.

Do not invent decisions to make the list look thorough. If there is only one, ask one. If there are none, say so and continue.

## Ask one at a time

Ask exactly one decision per turn. Do not preview the rest of the list beyond a short count ("3 decisions, here is the first"). Batching them defeats the point.

When the `AskUserQuestion` tool is available, use it. Give three options. Put the recommended option first with "(Recommended)" at the end of its label. Each option gets a one or two sentence description that says what it means and what it costs, so the choice is real and not just a label. The tool already lets him type his own answer, so do not add a fourth "other" option.

When the tool is not available, ask in plain text with the same shape: one short line of context on why this decision exists, then three numbered options with the recommended one marked, then a note that he can answer in his own words.

Keep the framing short. He knows the context; one or two sentences on why this matters and what depends on it is enough. Put the tradeoff in the option descriptions, not in a preamble.

When he answers in free text instead of picking an option, take that answer as final. Do not re-ask or try to map it back onto one of your options unless it is truly ambiguous. If his answer changes a later decision (removes it, or changes its options), adjust before asking the next one.

## Finish

After the last answer, give a compact summary: each decision and the answer, plus any defaults you chose on his behalf without asking. Keep it scannable.

What happens next depends on context. If you were in the middle of a task and the decisions were the blocker, continue the task with the answers. If he invoked this to plan or review before any work, stop after the summary and wait. If it is unclear, ask in one line whether to proceed.
