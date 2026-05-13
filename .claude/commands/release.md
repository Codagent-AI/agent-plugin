# /release - Create a release PR from merged PRs

Generate changesets from merged PRs since the last release, version the package,
and create a release PR. When that PR merges to `main`, `.github/workflows/publish.yml`
publishes `@codagent-ai/agent-plugin` to npm.

## Steps

### 1. Pre-release verification

Run the full checks before proceeding:

```bash
npm run typecheck
npm test
npm run build
```

### 2. Prepare the working branch

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch origin main --tags
LAST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -1)
TAG_DATE=$(git log -1 --format=%cI "$LAST_TAG" 2>/dev/null || echo "1970-01-01T00:00:00Z")
```

If `CURRENT_BRANCH` is `main`, pull latest:

```bash
git pull origin main
```

If `CURRENT_BRANCH` is not `main`, verify it already has a PR and merge in
`origin/main` before creating release changes:

```bash
git log --oneline origin/main..HEAD
gh pr view --json number,title,labels
git merge origin/main --no-edit
```

Stop if the branch has commits ahead of `origin/main` but no PR.

### 3. Find PRs to include

List merged PRs on `main` since the last release tag:

```bash
gh pr list --state merged --base main --search "merged:>$TAG_DATE" --json number,title,mergedAt,labels --limit 100
```

Exclude release PRs whose titles match:

- `chore: version packages`
- `chore: release`
- Any title starting with `chore(release)`

If the current branch is not `main`, include its PR as well, unless it matches
one of the release exclusions.

### 4. Create changeset files

For each qualifying PR, create `.changeset/pr-<number>.md`:

```markdown
---
"@codagent-ai/agent-plugin": <bump>
---

<summary>
```

Bump type:

- `major`: title contains `!:` or PR has a `breaking` label
- `minor`: title starts with `feat:` or `feat(...):`
- `patch`: everything else

Use a single concise summary with the conventional commit prefix stripped.

### 5. Version the package

```bash
npm run version
npm install --package-lock-only
```

This consumes `.changeset/pr-*.md`, updates `CHANGELOG.md`, bumps
`package.json`, and syncs `package-lock.json`.

### 6. Reformat the changelog

For the new version section, rewrite entries to this format:

```markdown
- [#<number>](https://github.com/Codagent-AI/agent-plugin/pull/<number>) <description>
```

Keep entries sorted by PR number ascending.

### 7. Commit and push the release

```bash
NEW_VERSION=$(node -p "require('./package.json').version")
```

If `CURRENT_BRANCH` is not `main`, commit release changes to the current PR:

```bash
git add CHANGELOG.md package.json package-lock.json
git add -A .changeset/
git commit -m "chore: release v${NEW_VERSION}"
git push
gh pr view --json url --jq .url
```

If `CURRENT_BRANCH` is `main`, create a release branch and PR:

```bash
git checkout -B "release/v${NEW_VERSION}"
git add CHANGELOG.md package.json package-lock.json
git add -A .changeset/
git commit -m "chore: release v${NEW_VERSION}"
git push -u origin "release/v${NEW_VERSION}"
gh pr create --base main --title "chore: release v${NEW_VERSION}" --body "## Release v${NEW_VERSION}"
```

### 8. Publish

Merge the release PR to `main`. The `Release` workflow will:

- Check whether the version is already published on npm
- Publish with `npm publish` using `secrets.NPM_TOKEN`
- Create a GitHub release tagged `v<version>`
