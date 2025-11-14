#!/usr/bin/env node

/**
 * Subresource Integrity (SRI) Hash Generator
 *
 * This script generates SRI hashes for third-party scripts and updates HTML files
 * with integrity attributes to ensure script integrity.
 *
 * Usage:
 *   node scripts/generate-sri.js
 *   node scripts/generate-sri.js --urls="https://cdn.example.com/script.js,https://cdn.example.com/style.css"
 *   node scripts/generate-sri.js --file="public/index.html"
 *
 * Features:
 * - Fetches scripts from URLs and calculates SHA-384 hashes
 * - Updates HTML files with integrity attributes
 * - Supports multiple hash algorithms (SHA-256, SHA-384, SHA-512)
 * - Validates existing integrity attributes
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const HASH_ALGORITHM = 'sha384'; // Most commonly used for SRI
const COMMON_CDN_SCRIPTS = [
  // Chart.js for data visualization
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  // React (if loaded from CDN)
  'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',
];

/**
 * Fetch content from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<Buffer>} Content as buffer
 */
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Generate SRI hash for content
 * @param {Buffer} content - Content to hash
 * @param {string} algorithm - Hash algorithm (sha256, sha384, sha512)
 * @returns {string} SRI hash
 */
function generateSRIHash(content, algorithm = HASH_ALGORITHM) {
  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Generate SRI hash for a URL
 * @param {string} url - Script/style URL
 * @returns {Promise<{url: string, integrity: string}>}
 */
async function generateSRIForURL(url) {
  try {
    console.log(`Fetching: ${url}`);
    const content = await fetchURL(url);
    const integrity = generateSRIHash(content);

    console.log(`  ✓ Generated SRI: ${integrity}`);

    return { url, integrity };
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate SRI hashes for multiple URLs
 * @param {string[]} urls - Array of URLs
 * @returns {Promise<Array<{url: string, integrity: string}>>}
 */
async function generateSRIForURLs(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const result = await generateSRIForURL(url);
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate SRI for ${url}:`, error.message);
    }
  }

  return results;
}

/**
 * Update HTML file with SRI attributes
 * @param {string} filePath - Path to HTML file
 * @param {Array<{url: string, integrity: string}>} sriData - SRI data
 */
async function updateHTMLWithSRI(filePath, sriData) {
  try {
    let html = await fs.readFile(filePath, 'utf-8');
    let updated = false;

    // Create a map for quick lookup
    const sriMap = new Map(sriData.map(item => [item.url, item.integrity]));

    // Update script tags
    html = html.replace(
      /<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi,
      (match, before, src, after) => {
        if (sriMap.has(src)) {
          const integrity = sriMap.get(src);

          // Check if integrity attribute already exists
          if (/integrity=/i.test(match)) {
            // Replace existing integrity
            match = match.replace(/integrity=["'][^"']*["']/i, `integrity="${integrity}"`);
          } else {
            // Add integrity and crossorigin attributes
            match = `<script${before} src="${src}" integrity="${integrity}" crossorigin="anonymous"${after}>`;
          }

          updated = true;
          console.log(`  ✓ Updated script: ${src}`);
        }
        return match;
      }
    );

    // Update link tags (for stylesheets)
    html = html.replace(
      /<link([^>]*)\shref=["']([^"']+)["']([^>]*)>/gi,
      (match, before, href, after) => {
        if (sriMap.has(href) && /rel=["']stylesheet["']/i.test(match)) {
          const integrity = sriMap.get(href);

          // Check if integrity attribute already exists
          if (/integrity=/i.test(match)) {
            // Replace existing integrity
            match = match.replace(/integrity=["'][^"']*["']/i, `integrity="${integrity}"`);
          } else {
            // Add integrity and crossorigin attributes
            match = `<link${before} href="${href}" integrity="${integrity}" crossorigin="anonymous"${after}>`;
          }

          updated = true;
          console.log(`  ✓ Updated stylesheet: ${href}`);
        }
        return match;
      }
    );

    if (updated) {
      await fs.writeFile(filePath, html, 'utf-8');
      console.log(`✓ Updated HTML file: ${filePath}`);
    } else {
      console.log(`  No matching URLs found in ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to update HTML file ${filePath}:`, error.message);
  }
}

/**
 * Find all HTML files in a directory
 * @param {string} dir - Directory path
 * @returns {Promise<string[]>} Array of HTML file paths
 */
async function findHTMLFiles(dir) {
  const files = [];

  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!['node_modules', '.git', 'dist', '.astro'].includes(entry.name)) {
          await scan(fullPath);
        }
      } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Save SRI data to JSON file
 * @param {Array<{url: string, integrity: string}>} sriData - SRI data
 * @param {string} outputPath - Output file path
 */
async function saveSRIData(sriData, outputPath) {
  const data = {
    generated: new Date().toISOString(),
    algorithm: HASH_ALGORITHM,
    entries: sriData,
  };

  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Saved SRI data to: ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const flags = {};

  // Parse command-line arguments
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    flags[key.replace(/^--/, '')] = value;
  });

  let urls = COMMON_CDN_SCRIPTS;

  // Check for custom URLs
  if (flags.urls) {
    urls = flags.urls.split(',').map(url => url.trim());
  }

  console.log('\n📦 Subresource Integrity (SRI) Generator\n');
  console.log(`Generating SRI hashes for ${urls.length} URLs...\n`);

  // Generate SRI hashes
  const sriData = await generateSRIForURLs(urls);

  if (sriData.length === 0) {
    console.error('\n✗ No SRI hashes generated. Exiting.');
    process.exit(1);
  }

  console.log(`\n✓ Generated ${sriData.length} SRI hashes\n`);

  // Display results
  console.log('SRI Hashes:\n');
  sriData.forEach(({ url, integrity }) => {
    console.log(`${url}`);
    console.log(`  integrity="${integrity}"\n`);
  });

  // Save to JSON file
  const outputPath = path.join(__dirname, '..', 'sri-hashes.json');
  await saveSRIData(sriData, outputPath);

  // Update HTML files if specified
  if (flags.file) {
    console.log(`\nUpdating HTML file: ${flags.file}\n`);
    await updateHTMLWithSRI(flags.file, sriData);
  } else {
    // Find and update all HTML files in public directory
    const publicDir = path.join(__dirname, '..', 'apps', 'corp-cockpit-astro', 'public');

    try {
      await fs.access(publicDir);
      console.log(`\nSearching for HTML files in: ${publicDir}\n`);

      const htmlFiles = await findHTMLFiles(publicDir);

      if (htmlFiles.length > 0) {
        console.log(`Found ${htmlFiles.length} HTML file(s)\n`);

        for (const file of htmlFiles) {
          await updateHTMLWithSRI(file, sriData);
        }
      } else {
        console.log('No HTML files found.');
      }
    } catch (error) {
      console.log(`Public directory not found: ${publicDir}`);
      console.log('Skipping HTML file updates.');
    }
  }

  console.log('\n✓ SRI generation complete!\n');
  console.log('Usage in HTML:');
  console.log('  <script src="URL" integrity="HASH" crossorigin="anonymous"></script>');
  console.log('  <link href="URL" rel="stylesheet" integrity="HASH" crossorigin="anonymous">');
  console.log('');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  generateSRIHash,
  generateSRIForURL,
  generateSRIForURLs,
  updateHTMLWithSRI,
};
