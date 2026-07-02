import { describe, it, expect } from 'vitest';
import pkg from '../package.json';

/**
 * Release-config invariants (Phase 8, I4). The auto-updater reads
 * `build.publish` at runtime — a wrong owner/repo silently points every
 * installed app at a dead update feed (this actually shipped once as
 * vaultos/lumvalepdf). Locking it here turns that class of regression into a
 * unit-test failure.
 */
describe('electron-builder release config', () => {
  const build = (pkg as Record<string, any>).build;

  it('auto-update publish target is Lumvale/lumvale-pdf', () => {
    expect(build.publish).toEqual([
      expect.objectContaining({ provider: 'github', owner: 'Lumvale', repo: 'lumvale-pdf' }),
    ]);
  });

  it('app identity is com.lumvale.pdf', () => {
    expect(build.appId).toBe('com.lumvale.pdf');
  });

  it('electronVersion is pinned (monorepo range does not resolve)', () => {
    expect(build.electronVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('packaged files are allowlisted (dist + dist-electron only)', () => {
    expect(build.files).toEqual(expect.arrayContaining(['dist/**', 'dist-electron/**']));
  });
});
