# @codagent-ai/agent-plugin

## 0.1.2

- Included source GitHub URLs in Claude, Copilot, and fallback skills install
  output.
- Resolved Claude updates against installed plugin IDs such as
  `agent-validator@agent-validator`.
- Clarified fallback skills dry-run and success messages.

## 0.1.1

- Fixed CLI help and version output so Commander control-flow messages are not
  printed after `--help` or `--version`.
- Read the CLI version from `package.json` so published binaries report the
  package version.

## 0.1.0

- Initial release with Claude and Copilot native plugin installs plus Vercel
  `skills` fallback for Codex and other agents.
