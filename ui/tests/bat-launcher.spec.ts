import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');

test.describe('.bat launcher', () => {
  test('bat file exists and is readable', () => {
    const batPath = path.join(PROJECT_ROOT, 'lumvale-pdf.bat');
    expect(fs.existsSync(batPath)).toBe(true);
    expect(fs.statSync(batPath).isFile()).toBe(true);

    const content = fs.readFileSync(batPath, 'utf-8');
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });

  test('bat file contains required npm commands', () => {
    const batPath = path.join(PROJECT_ROOT, 'lumvale-pdf.bat');
    const content = fs.readFileSync(batPath, 'utf-8');

    // Verify it has the required commands in order
    expect(content).toContain('npm install');
    expect(content).toContain('npm run build:core');
    expect(content).toContain('npm run build:ui');
    expect(content).toContain('npm run start:ui');

    // Verify command ordering (build:core before build:ui before start:ui)
    const coreIdx = content.indexOf('npm run build:core');
    const uiBuildIdx = content.indexOf('npm run build:ui');
    const uiStartIdx = content.indexOf('npm run start:ui');

    expect(coreIdx).toBeGreaterThanOrEqual(0);
    expect(uiBuildIdx).toBeGreaterThan(coreIdx);
    expect(uiStartIdx).toBeGreaterThan(uiBuildIdx);
  });

  test('bat file uses call prefix for proper error handling', () => {
    const batPath = path.join(PROJECT_ROOT, 'lumvale-pdf.bat');
    const content = fs.readFileSync(batPath, 'utf-8');

    // Each npm command should use 'call' to ensure error handling
    const lines = content.split('\n');
    const npmCommands = lines.filter(line => line.includes('npm '));

    npmCommands.forEach(cmd => {
      expect(cmd.trim().startsWith('call')).toBe(true);
    });
  });

  test('bat file has pause at end for user feedback', () => {
    const batPath = path.join(PROJECT_ROOT, 'lumvale-pdf.bat');
    const content = fs.readFileSync(batPath, 'utf-8');

    // Verify pause command is at the end (waits for user to press a key)
    const lines = content.trim().split('\n');
    const lastLine = lines[lines.length - 1].trim();
    expect(lastLine.toLowerCase()).toBe('pause');
  });

  test('required npm scripts exist in package.json', () => {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts['build:core']).toBeDefined();
    expect(packageJson.scripts['build:ui']).toBeDefined();
    expect(packageJson.scripts['start:ui']).toBeDefined();
  });

  test('ui package.json has required scripts', () => {
    const packagePath = path.join(PROJECT_ROOT, 'ui/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    expect(packageJson.scripts).toBeDefined();
    // The start:ui should ultimately call vite preview or similar
    expect(packageJson.scripts['build']).toBeDefined();
    expect(packageJson.scripts['preview']).toBeDefined();
  });

  test('core package.json exists and has build script', () => {
    const packagePath = path.join(PROJECT_ROOT, 'core/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts['build']).toBeDefined();
  });
});
