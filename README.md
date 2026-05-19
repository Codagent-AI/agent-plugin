# agent-plugin

Install agent plugins through native CLIs when available, with Vercel `skills`
as the user-level fallback.

## Usage

Install:

```bash
npm install -g @codagent-ai/agent-plugin
```

```bash
agent-plugin add <source> [options]
agent-plugin install <source> [options]
agent-plugin update [plugin] [options]
agent-plugin list [options]
```

`<source>` is a GitHub shorthand such as `Codagent-AI/agent-skills`.

Options:

```bash
-a, --agent <agents...>   Target agents, repeatable or space-separated
-p, --project             Request project-level native plugin install/update
-y, --yes                 Skip prompts
--json                    Emit machine-readable JSON
--dry-run                 Show planned actions without mutating anything
```

Global/user scope is the default. `--project` only applies to native plugin
CLIs where supported. Fallback installs are always global/user-level.

## Routing

- `claude`, `claude-code`: native Claude plugin CLI
- `copilot`, `github-copilot`: native Copilot plugin CLI
- all other agent names: probe `<cli> plugin add --help`; use native
  `plugin marketplace add` + `plugin add` when supported, otherwise Vercel
  `skills`

Fallback install calls:

```bash
npx --yes skills add <source> --global --yes --skill '*' --agent <agent>
```

Generic native plugin install calls:

```bash
<cli> plugin marketplace add <source>
<cli> plugin add <plugin> --marketplace <marketplace>
```

Dry runs print the exact commands for native agents. For fallback agents, dry
runs report how many skills would be copied and the target global skills
directory when known.

If a native plugin install command fails, `agent-plugin` falls back to the
global/user-level `skills` copy path.

## Release

Releases use Changesets, but contributors do not need to create changesets on
normal PRs. The `.claude/commands/release.md` flow auto-generates changesets
from merged PRs, creates the release PR, and publishing happens when that
release PR merges to `main`.
