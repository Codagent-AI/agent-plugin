# @codagent-ai/agent-plugin

## 0.1.1

- Fixed CLI help and version output so Commander control-flow messages are not
  printed after `--help` or `--version`.
- Read the CLI version from `package.json` so published binaries report the
  package version.

## 0.1.0

- Initial release with Claude and Copilot native plugin installs plus Vercel
  `skills` fallback for Codex and other agents.
