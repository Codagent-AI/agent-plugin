import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildHomebrewFormula, isMainModule } from '../.github/scripts/homebrew-formula.js';

describe('homebrew formula generation', () => {
  it('generates an npm-backed formula for agent-plugin', () => {
    const formula = buildHomebrewFormula({
      version: '0.1.4',
      tarballUrl: 'https://registry.npmjs.org/@codagent-ai/agent-plugin/-/agent-plugin-0.1.4.tgz',
      sha256: 'a'.repeat(64),
    });

    expect(formula).toContain('class AgentPlugin < Formula');
    expect(formula).toContain('version "0.1.4"');
    expect(formula).toContain('url "https://registry.npmjs.org/@codagent-ai/agent-plugin/-/agent-plugin-0.1.4.tgz"');
    expect(formula).toContain(`sha256 "${'a'.repeat(64)}"`);
    expect(formula).toContain('depends_on "node"');
    expect(formula).toContain('system "npm", "install", *std_npm_args');
    expect(formula).toContain('bin.install_symlink libexec.glob("bin/*")');
    expect(formula).toContain('shell_output("#{bin}/agent-plugin --version")');
  });

  it('rejects a tarball URL that does not match the formula version', () => {
    expect(() =>
      buildHomebrewFormula({
        version: '0.1.4',
        tarballUrl: 'https://registry.npmjs.org/@codagent-ai/agent-plugin/-/agent-plugin-0.1.3.tgz',
        sha256: 'a'.repeat(64),
      }),
    ).toThrow('tarballUrl must match version');
  });

  it('detects the CLI entrypoint when argv uses a relative path', () => {
    const scriptPath = path.resolve('.github/scripts/homebrew-formula.ts');
    const relativeArgvPath = path.relative(process.cwd(), scriptPath);

    expect(isMainModule(pathToFileURL(scriptPath).href, relativeArgvPath)).toBe(true);
  });
});
