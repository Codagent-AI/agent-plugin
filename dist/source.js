import path from 'node:path';
import { z } from 'zod';
const githubSourceSchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
export function parseGithubSource(source) {
    const trimmed = source.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
    const normalized = githubSourceSchema.parse(trimmed);
    const [owner, repo] = normalized.split('/');
    return {
        owner,
        repo,
        normalized,
        pluginName: path.basename(repo),
    };
}
