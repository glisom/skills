# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-09-23

### Changed

- Support sequential review without subagents and conversation evidence without writable scratch. Clarify the boundary between temporary evidence and approval-gated changes.
- Include the MIT license in the standalone skill directory.

## [0.1.1] - 2026-09-15

### Changed

- Moved into the `glisom` marketplace at [glisom/skills](https://github.com/glisom/skills)
  as `plugins/skill-thief`. Install with `/plugin marketplace add glisom/skills` and then
  `/plugin install skill-thief@glisom`. The skill itself is unchanged.

## [0.1.0] - 2026-08-23

### Added

- Initial release: the skill-thief skill, the four-outcome granularity
  ladder, host discovery with on-demand verdict homes, source adapters for
  repositories, plugins, videos, and articles, and a zero-dependency
  validator covering manifest integrity, skill frontmatter budgets,
  reference-path integrity, and harness neutrality.
