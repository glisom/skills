# Source adapters

Phase 1 pins a source before anything downstream reads it. The gather step,
how you get the material in front of you and how you pin it, differs by
medium. Everything after gathering (scouting for mechanisms, checking for
prior art, classifying, the gate, absorbing) is identical no matter which
adapter applies. Medium is an input to Phase 1, not a fork in the rest of the
procedure.

Pick the adapter that matches the source and follow its pin rule. If a source
spans two media (a talk with an accompanying repo), pin each part separately
and record both.

## Git repository

Gather by cloning or reading the repository at a specific ref, not whatever
branch happens to be checked out by default.

Pin the source by recording the exact commit SHA read, plus the repository
URL. A branch name or tag alone is not a pin, because both can move. If the
repository has no commit history available (a snapshot, a zip export), record
whatever version identifier it does carry and note explicitly that a SHA was
not available.

## Installed plugin or marketplace

Gather from wherever your harness keeps installed plugins, for example your
harness's plugin directory or wherever your agent installs plugins. Do not
assume this location matches the source's own upstream repository; the two
can drift.

Pin the source by recording the installed version string and comparing it
against the version currently published upstream. If they differ, record
both versions and treat the installed copy as the one actually being
reviewed, since that is the one shaping the host's behavior today. A source
review that silently reads upstream while the host runs an older installed
copy produces findings that do not describe what is actually installed.

## Video or talk

Gather by watching or reading a transcript of the material.

Pin the source by recording the publish date and the exact timestamp range
within the video that the finding comes from, plus the URL. A finding
attributed to "the talk" with no timestamp cannot be re-checked later; a
finding attributed to "14:32 to 16:05 of the talk at this URL, published on
this date" can be.

## Article or documentation

Gather by reading the page as published.

Pin the source by recording the publish date (or last-modified date if no
publish date is shown) and the URL. Pages change silently after publication
more often than repositories do, so the date matters even when a SHA is not
available. If the page shows no date at all, record that explicitly rather
than guessing one.

## Why this matters past Phase 1

An unpinned finding cannot be diffed later. Re-run behavior depends on
knowing exactly which version of the source produced the prior findings
document, so that a later run can report only what changed since then. A
source review that skips pinning is not reproducible, no matter how careful
the reading was.
