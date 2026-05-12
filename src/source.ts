import path from 'node:path';
import { z } from 'zod';

const githubSourceSchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

export interface ParsedSource {
  owner: string;
  repo: string;
  normalized: string;
  pluginName: string;
}

export function parseGithubSource(source: string): ParsedSource {
  const trimmed = source.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  const normalized = githubSourceSchema.parse(trimmed);
  const [owner, repo] = normalized.split('/') as [string, string];
  return {
    owner,
    repo,
    normalized,
    pluginName: path.basename(repo),
  };
}
