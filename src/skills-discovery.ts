import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CommandRunner } from './types.js';

export async function countSkillsFromGithubSource(
  source: string,
  runner: CommandRunner,
): Promise<number> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'agent-plugin-skills-'));
  try {
    const url = `https://github.com/${source}.git`;
    const clone = await runner.run('git', ['clone', '--depth', '1', url, tmp]);
    if (clone.code !== 0) return 0;
    return countSkillFiles(tmp);
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
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      count += 1;
    }
  }
  return count;
}
