# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-09-15

### Changed

- Moved into the `glisom` marketplace at [glisom/skills](https://github.com/glisom/skills)
  as `plugins/ux-deep-dive`. Install with `/plugin marketplace add glisom/skills` and then
  `/plugin install ux-deep-dive@glisom`. The skill itself is unchanged.

## [0.1.0] - 2026-09-02

### Added

- Initial release: the ux-deep-dive skill, the eight-phase run (pin, stand up,
  calibrate, inventory, walk, record, assemble, restore), the five-tag severity
  ladder with its evidence rule, the environment ladder, the capture rig and
  its probe, platform references for the iOS simulator, the Android emulator,
  and the web, the deliverable spec, the audit and motion page builders, the
  capture and record helpers, a fixture-server skeleton, a Playwright bulk
  capture script, and a zero-dependency validator covering manifest integrity,
  skill frontmatter budgets, reference and asset path integrity, harness
  neutrality, prose style, and asset script health.
