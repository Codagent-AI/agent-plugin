---
name: release-agent-plugin
description: Release the agent-plugin project end to end. Use when asked to version, publish, merge, or ship @codagent-ai/agent-plugin, including npm publication, GitHub Release verification, and Homebrew tap formula updates.
---

# Release Agent Plugin

Release `@codagent-ai/agent-plugin` from this repo and complete the matching Homebrew tap update.

## Preconditions

- Work from `/Users/paul/codagent/agent-plugin`.
- Confirm `gh auth status` works.
- Confirm the worktree is clean before merging or publishing:

```bash
git status --porcelain=v1 -b
```

- Use `/Users/paul/codagent/homebrew-tap` for the formula update.
- Do not merge the Homebrew tap PR until the npm version is actually published and its registry tarball SHA256 is known.

## Understand The Release Model

This repo publishes on `main` through `.github/workflows/publish.yml`.

On every push to `main`, the `Release` workflow:

1. Installs dependencies.
2. Builds, typechecks, and tests.
3. Checks whether `package.json`'s version already exists on npm.
4. Runs `npm publish` if the version is unpublished.
5. Creates GitHub Release `v<version>` if publish succeeds.

The historical release command is `.claude/commands/release.md`; read it if the branch does not already contain a version bump.

## Version Bump

1. Check the current versions:

```bash
node -p "require('./package.json').version"
npm view @codagent-ai/agent-plugin version --json
git tag --list 'v*' --sort=-v:refname | head
```

2. If the pending PR already bumps `package.json`, `package-lock.json`, and `CHANGELOG.md`, do not create another bump.
3. If no bump exists, follow `.claude/commands/release.md`:
   - Run `npm run typecheck`, `npm test`, and `npm run build`.
   - Create `.changeset/pr-<number>.md` entries for qualifying PRs.
   - Run `npm run version`.
   - Run `npm install --package-lock-only`.
   - Reformat the new changelog section as PR-linked bullets.
   - Commit the release changes.

## Merge Agent Plugin PR

1. Verify the PR is clean and checks pass:

```bash
gh pr view <number> --json url,state,mergeStateStatus,statusCheckRollup,headRefOid
```

2. Merge with the appropriate strategy for the repo. Squash merge is acceptable when the PR is already a cohesive release unit:

```bash
gh pr merge <number> --squash --delete-branch --subject "<title>" --body "<body>"
```

3. Sync local `main`. If local `main` diverges only because an already-squashed local commit is duplicated upstream, use `git rebase origin/main` and confirm Git drops the duplicate patch.

## Publish And Verify npm

1. Watch the release workflow from the merge push:

```bash
gh run list --workflow Release --branch main --limit 5
gh run watch <run-id> --exit-status
```

2. If `npm publish` fails with `E404 Not Found - PUT ...`, treat it as an npm token permission problem:
   - Ask the user to update the repo `NPM_TOKEN` secret with a token for an npm maintainer of `@codagent-ai/agent-plugin`.
   - Rerun only failed jobs after the secret is fixed:

```bash
gh run rerun <run-id> --failed
gh run watch <run-id> --exit-status
```

3. Verify npm and GitHub Release:

```bash
npm view @codagent-ai/agent-plugin@<version> version dist.tarball dist.shasum dist.integrity --json
gh release view v<version> --json tagName,url,publishedAt,targetCommitish
git fetch origin main --tags
git tag --list "v<version>"
```

## Update Homebrew Tap

1. Work in the tap repo:

```bash
cd /Users/paul/codagent/homebrew-tap
git fetch origin main
git status --porcelain=v1 -b
```

2. Create or update the formula branch/PR. For this package, update `agent-plugin.rb`:
   - `url` to `https://registry.npmjs.org/@codagent-ai/agent-plugin/-/agent-plugin-<version>.tgz`
   - `sha256` to the SHA256 of the published npm tarball
   - Remove an explicit `version` line if Homebrew can infer it from the URL.

3. Compute the registry tarball SHA256 from npm, not from a local pre-publish pack:

```bash
tmp=$(mktemp -d)
npm pack @codagent-ai/agent-plugin@<version> --pack-destination "$tmp"
shasum -a 256 "$tmp"/*.tgz
```

4. Validate what is feasible locally:

```bash
ruby -c agent-plugin.rb
brew update
brew fetch --force --formula codagent-ai/tap/agent-plugin
```

If `brew audit` reports the explicit `version` is redundant, remove it. If path-based audit/fetch is disabled, use the tapped formula name after pushing/updating the tap.

5. Commit, push, and merge the tap PR:

```bash
git add agent-plugin.rb
git commit -m "Bump agent-plugin to <version>"
git push -u origin <branch>
gh -R Codagent-AI/homebrew-tap pr view <number> --json url,state,mergeStateStatus,statusCheckRollup
gh -R Codagent-AI/homebrew-tap pr merge <number> --squash --delete-branch --subject "Bump agent-plugin to <version>" --body "Update agent-plugin formula to the published npm <version> tarball and verified SHA256."
```

## Final Verification

Report these concrete facts:

- agent-plugin PR merged.
- `Release` workflow URL and success status.
- npm `@codagent-ai/agent-plugin@<version>` is published.
- GitHub Release `v<version>` URL.
- Homebrew tap PR merged.
- Formula URL and SHA256.
- Both local worktrees are clean and synced to `origin/main`.

