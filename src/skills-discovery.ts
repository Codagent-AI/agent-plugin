import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CommandRunner } from './types.js';

export interface SourceInspection {
  skillCount: number;
  claudePluginName?: string;
  codexPluginName?: string;
  marketplaceName?: string;
}

export async function inspectGithubSource(
  source: string,
  runner: CommandRunner,
): Promise<SourceInspection> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'agent-plugin-skills-'));
  try {
    const url = `https://github.com/${source}.git`;
    const clone = await runner.run('git', ['clone', '--depth', '1', url, tmp]);
    if (clone.code !== 0) return { skillCount: 0 };
    return {
      skillCount: await countSkillFiles(tmp),
      claudePluginName: await readClaudePluginName(tmp),
      codexPluginName: await readCodexPluginName(tmp),
      marketplaceName: await readMarketplaceName(tmp),
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function countSkillFiles(dir: string): Promise<number> {
  let count = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countSkillFiles(child);
    } else if (entry.isFile() && entry.name === 'SKILL.md' && await hasVercelSkillMetadata(child)) {
      count += 1;
    }
  }
  return count;
}

async function hasVercelSkillMetadata(file: string): Promise<boolean> {
  try {
    const content = await readFile(file, 'utf8');
    const firstFence = content.indexOf('---');
    const secondFence = content.indexOf('---', firstFence + 3);
    if (firstFence !== 0 || secondFence < 0) return false;
    const frontmatter = content.slice(firstFence + 3, secondFence);
    return /^name:\s*\S+/m.test(frontmatter) && /^description:\s*\S+/m.test(frontmatter);
  } catch {
    return false;
  }
}

async function readClaudePluginName(repoRoot: string): Promise<string | undefined> {
  try {
    const content = await readFile(path.join(repoRoot, '.claude-plugin', 'plugin.json'), 'utf8');
    const parsed = JSON.parse(content) as { name?: unknown };
    return typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function readCodexPluginName(repoRoot: string): Promise<string | undefined> {
  try {
    const content = await readFile(path.join(repoRoot, '.codex-plugin', 'plugin.json'), 'utf8');
    const parsed = JSON.parse(content) as { name?: unknown };
    return typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function readMarketplaceName(repoRoot: string): Promise<string | undefined> {
  try {
    const content = await readFile(path.join(repoRoot, '.claude-plugin', 'marketplace.json'), 'utf8');
    const parsed = JSON.parse(content) as { name?: unknown };
    return typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : undefined;
  } catch {
    return undefined;
  }
}
