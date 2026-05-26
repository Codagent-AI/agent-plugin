import { describe, expect, it } from 'vitest';
import { buildHomebrewFormula } from '../.github/scripts/homebrew-formula.js';

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
});
