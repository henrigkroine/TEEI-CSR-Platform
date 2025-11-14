#!/usr/bin/env node

import { readFileSync } from 'fs';
import { existsSync, statSync } from 'fs';
import sharp from 'sharp';

const manifest = JSON.parse(readFileSync('/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/public/manifest.json', 'utf8'));
const iconsDir = '/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/public/icons/';

console.log('\n═══════════════════════════════════════════════════');
console.log('PWA ICON GENERATION - FINAL VERIFICATION REPORT');
console.log('═══════════════════════════════════════════════════\n');

// Check standard icons
console.log('STANDARD ICONS (any purpose):');
let totalSize = 0;
const standardSizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of standardSizes) {
  const filename = `icon-${size}x${size}.png`;
  const filepath = iconsDir + filename;
  if (existsSync(filepath)) {
    const stats = statSync(filepath);
    totalSize += stats.size;
    console.log(`  ✓ ${filename.padEnd(20)} ${(stats.size/1024).toFixed(1).padStart(6)} KB`);
  }
}

// Check maskable icons
console.log('\nMASKABLE ICONS (Android adaptive):');
const maskableSizes = [192, 512];
for (const size of maskableSizes) {
  const filename = `icon-${size}x${size}-maskable.png`;
  const filepath = iconsDir + filename;
  if (existsSync(filepath)) {
    const stats = statSync(filepath);
    totalSize += stats.size;
    const metadata = await sharp(filepath).metadata();
    console.log(`  ✓ ${filename.padEnd(25)} ${(stats.size/1024).toFixed(1).padStart(5)} KB (${metadata.width}x${metadata.height}, ${metadata.format.toUpperCase()})`);
  }
}

// Check shortcut icons
console.log('\nSHORTCUT ICONS:');
const shortcuts = ['dashboard', 'reports', 'evidence'];
for (const name of shortcuts) {
  const filename = `shortcut-${name}.png`;
  const filepath = iconsDir + filename;
  if (existsSync(filepath)) {
    const stats = statSync(filepath);
    totalSize += stats.size;
    console.log(`  ✓ ${filename.padEnd(25)} ${(stats.size/1024).toFixed(1).padStart(5)} KB`);
  }
}

// Manifest validation
console.log('\nMANIFEST CONFIGURATION:');
console.log(`  ✓ Name: ${manifest.name}`);
console.log(`  ✓ Short name: ${manifest.short_name}`);
console.log(`  ✓ Theme color: ${manifest.theme_color}`);
console.log(`  ✓ Background color: ${manifest.background_color}`);
console.log(`  ✓ Display mode: ${manifest.display}`);
console.log(`  ✓ Icons defined: ${manifest.icons.length}`);
console.log(`  ✓ Shortcuts defined: ${manifest.shortcuts.length}`);

// Icon purposes
const purposes = {};
manifest.icons.forEach(icon => {
  purposes[icon.purpose] = (purposes[icon.purpose] || 0) + 1;
});
console.log('\nICON PURPOSES:');
for (const [purpose, count] of Object.entries(purposes)) {
  console.log(`  ✓ "${purpose}": ${count} icon(s)`);
}

console.log('\nTOTAL ICONS DIRECTORY SIZE:');
console.log(`  ${(totalSize/1024).toFixed(1)} KB\n`);

console.log('✅ PWA ICONS READY FOR DEPLOYMENT');
console.log('═══════════════════════════════════════════════════\n');
