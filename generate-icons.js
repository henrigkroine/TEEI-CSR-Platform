#!/usr/bin/env node

/**
 * PWA Icon Generator for Corporate Cockpit
 * Generates PNG icons of various sizes from SVG source
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SOURCE_SVG = path.join(__dirname, 'apps/corp-cockpit-astro/public/favicon.svg');
const OUTPUT_DIR = path.join(__dirname, 'apps/corp-cockpit-astro/public/icons');
const THEME_COLOR = '#0066cc';
const BACKGROUND_COLOR = '#ffffff';

// Icon sizes to generate
const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const SHORTCUT_SIZES = [96];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Convert SVG to PNG at a specific size
 */
async function svgToPng(svgPath, size) {
  // Create a larger SVG that includes background padding
  const backgroundSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#grad)"/>
      <circle cx="50" cy="40" r="15" fill="white" opacity="0.9"/>
      <circle cx="35" cy="65" r="8" fill="white" opacity="0.8"/>
      <circle cx="65" cy="65" r="8" fill="white" opacity="0.8"/>
      <path d="M 35 65 Q 50 75 65 65" stroke="white" stroke-width="3" fill="none" opacity="0.8"/>
    </svg>
  `;

  return Buffer.from(backgroundSvg);
}

/**
 * Create maskable icon with padding
 */
async function createMaskableIcon(pngBuffer, size) {
  // Create a new image with padding (20% on each side = 60% of original is content)
  const paddingPercent = 20; // 20% on each side
  const contentSize = Math.round(size * (100 - paddingPercent * 2) / 100);
  const padding = Math.round((size - contentSize) / 2);

  // Create transparent background and composite the icon in the center
  const transparent = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="rgba(0,0,0,0)"/>
    </svg>`
  );

  return sharp(pngBuffer)
    .resize(contentSize, contentSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()
    .then(resizedBuffer => {
      // Create canvas with padding
      return sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        }
      })
        .composite([
          {
            input: resizedBuffer,
            left: padding,
            top: padding
          }
        ])
        .png()
        .toBuffer();
    });
}

/**
 * Generate icon at specified size
 */
async function generateIcon(size, isMaskable = false) {
  try {
    const svgBuffer = await svgToPng(SOURCE_SVG, size);
    let pngBuffer = await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    if (isMaskable) {
      pngBuffer = await createMaskableIcon(pngBuffer, size);
    }

    return pngBuffer;
  } catch (error) {
    console.error(`Error generating ${size}x${size}${isMaskable ? ' maskable' : ''}:`, error.message);
    return null;
  }
}

/**
 * Generate shortcut icon (custom design)
 */
async function generateShortcutIcon(name, size) {
  const icons = {
    dashboard: 'M20,3H4C2.9,3 2,3.9 2,5v14c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2V5C22,3.9 21.1,3 20,3M5,7h3v10H5V7M19,17h-3V5h3V17Z',
    reports: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
    evidence: 'M19,13H5V7H19M19,3H5C3.9,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3Z'
  };

  const pathD = icons[name.toLowerCase()] || icons.dashboard;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="4" fill="url(#grad)"/>
      <path d="${pathD}" fill="white" opacity="0.95" transform="translate(${(size-24)/2}, ${(size-24)/2})"/>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();
}

/**
 * Main generation function
 */
async function generateAllIcons() {
  console.log('🎨 Generating PWA Icons for Corporate Cockpit...\n');

  // Generate standard icons
  console.log('📦 Standard Icons:');
  for (const size of STANDARD_SIZES) {
    try {
      const buffer = await generateIcon(size, false);
      if (buffer) {
        const filename = `icon-${size}x${size}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        const stats = fs.statSync(filepath);
        console.log(`  ✓ ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  // Generate maskable icons
  console.log('\n🎭 Maskable Icons (Android):');
  for (const size of MASKABLE_SIZES) {
    try {
      const buffer = await generateIcon(size, true);
      if (buffer) {
        const filename = `icon-${size}x${size}-maskable.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        const stats = fs.statSync(filepath);
        console.log(`  ✓ ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to generate icon-${size}x${size}-maskable.png:`, error.message);
    }
  }

  // Generate shortcut icons
  console.log('\n🎯 Shortcut Icons:');
  const shortcuts = ['dashboard', 'reports', 'evidence'];
  for (const shortcut of shortcuts) {
    try {
      const buffer = await generateShortcutIcon(shortcut, 96);
      const filename = `shortcut-${shortcut}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      const stats = fs.statSync(filepath);
      console.log(`  ✓ ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error(`  ✗ Failed to generate shortcut-${shortcut}.png:`, error.message);
    }
  }

  // List all generated files
  console.log('\n✅ Icon Generation Complete!\n');
  console.log('Generated files:');
  const files = fs.readdirSync(OUTPUT_DIR).sort();
  files.forEach(file => {
    if (file !== 'README.md') {
      const filepath = path.join(OUTPUT_DIR, file);
      const stats = fs.statSync(filepath);
      console.log(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  });
}

// Run the generator
generateAllIcons().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
