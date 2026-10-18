#!/usr/bin/env node
/**
 * Build script for generating browser extension packages:
 * - dist/firefox/ and dist/aws-builder-badges-firefox.zip (Manifest V3 with background.scripts)
 * - dist/chrome/ and dist/aws-builder-badges-chrome.zip (Manifest V3 with background.service_worker)
 * - dist/aws-builder-badges-addon.zip (default Firefox package)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const baseManifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

// Ensure dist directories exist
const targets = ['firefox', 'chrome'];
for (const target of targets) {
  const targetDir = path.join(distDir, target);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy standard extension folders
  const folders = ['icons', 'common', 'background', 'popup', 'content'];
  for (const folder of folders) {
    fs.cpSync(path.join(rootDir, folder), path.join(targetDir, folder), { recursive: true });
  }

  // Create target-specific manifest
  const manifest = JSON.parse(JSON.stringify(baseManifest));

  if (target === 'chrome') {
    // Chrome MV3 uses service_worker
    manifest.background = {
      service_worker: 'background/background.js'
    };
    // Remove Firefox-specific gecko settings
    delete manifest.browser_specific_settings;
  } else {
    // Firefox uses background.scripts
    manifest.background = {
      scripts: [
        'common/badges-data.js',
        'common/streak-manager.js',
        'common/storage.js',
        'background/background.js'
      ]
    };
  }

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  // Create zip file
  const zipName = `aws-builder-badges-${target}.zip`;
  const zipPath = path.join(distDir, zipName);
  try {
    execSync(`cd "${targetDir}" && zip -r -FS "${zipPath}" . -x '*.DS_Store' '*__MACOSX*'`, { stdio: 'pipe' });
    console.log(`✓ Built ${target.toUpperCase()} extension package: dist/${zipName} & dist/${target}/`);
  } catch (err) {
    console.error(`Failed to create zip for ${target}:`, err);
  }
}


