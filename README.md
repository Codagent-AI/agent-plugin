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
- all other agent names, including `codex`: Vercel `skills`

Fallback install calls:

```bash
npx --yes skills add <source> --global --yes --skill '*' --agent <agent>
```

Dry runs print the exact commands for native agents. For fallback agents, dry
runs report how many skills would be copied and the target global skills
directory when known.

## Release

Releases use Changesets. Run `npm run changeset` for user-facing changes, then
use `.claude/commands/release.md` to create a release PR. Merging that PR to
`main` publishes `@codagent-ai/agent-plugin` to npm through the `Release`
workflow.
