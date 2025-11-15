#!/usr/bin/env node
/**
 * E2E Coverage Tracker
 *
 * Analyzes E2E test files and application routes to calculate E2E coverage percentage.
 * Target: ≥60% of critical routes covered by E2E tests
 *
 * Usage:
 *   node scripts/e2e-coverage.js
 *   node scripts/e2e-coverage.js --verbose
 *
 * Output:
 *   JSON with coverage percentage, total routes, and covered routes
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // Astro routes directory
  routesDir: path.join(__dirname, '../apps/corp-cockpit-astro/src/pages'),
  // E2E test files
  e2eTestsGlob: 'apps/corp-cockpit-astro/tests/e2e/**/*.spec.ts',
  // Also check root-level E2E tests
  rootE2eGlob: 'tests/e2e/**/*.spec.ts',
  // Output file
  outputFile: path.join(__dirname, '../e2e-coverage.json'),
  // Verbose mode
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

/**
 * Extract routes from Astro pages directory
 */
function extractRoutes() {
  const routes = [];

  function walkDir(dir, basePath = '') {
    if (!fs.existsSync(dir)) {
      console.error(`Routes directory not found: ${dir}`);
      return;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recurse into subdirectories
        walkDir(fullPath, path.join(basePath, file));
      } else if (file.endsWith('.astro') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        // Convert file path to route
        let route = path.join(basePath, file);
        route = route
          .replace(/\.(astro|ts|tsx)$/, '')
          .replace(/index$/, '')
          .replace(/\\/g, '/');

        // Handle dynamic routes
        route = route.replace(/\[([^\]]+)\]/g, ':$1');

        // Add leading slash if missing
        if (!route.startsWith('/')) {
          route = '/' + route;
        }

        // Remove trailing slash except for root
        if (route !== '/' && route.endsWith('/')) {
          route = route.slice(0, -1);
        }

        routes.push({
          path: route,
          file: fullPath.replace(process.cwd(), '.')
        });
      }
    }
  }

  walkDir(CONFIG.routesDir);
  return routes;
}

/**
 * Extract covered routes from E2E test files
 */
function extractCoveredRoutes() {
  const coveredRoutes = new Set();
  const testFiles = [];

  // Find all E2E test files
  const cockpitTests = glob.sync(CONFIG.e2eTestsGlob);
  const rootTests = glob.sync(CONFIG.rootE2eGlob);
  testFiles.push(...cockpitTests, ...rootTests);

  if (CONFIG.verbose) {
    console.log(`Found ${testFiles.length} E2E test files`);
  }

  // Common route patterns to look for in tests
  const routePatterns = [
    /page\.goto\(['"](\/[^'"]*)['"]/g,          // page.goto('/route')
    /await.*goto\(['"](\/[^'"]*)['"]/g,         // await page.goto('/route')
    /expect.*toHaveURL\(['"](\/[^'"]*)['"]/g,   // expect(page).toHaveURL('/route')
    /baseURL.*['"](\/[^'"]*)['"]/g,              // baseURL + '/route'
    /test\(['"](.*?)['"].*?=>\s*{[\s\S]*?goto\(['"](\/[^'"]*)['"]/g  // Extract from test body
  ];

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8');

    for (const pattern of routePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Get the last capture group (the route)
        const route = match[match.length - 1];

        // Clean up the route
        let cleanRoute = route
          .replace(/\$\{[^}]+\}/g, ':param')  // Template literals
          .replace(/\?.*$/, '')                // Query params
          .replace(/#.*$/, '')                 // Hash
          .trim();

        // Normalize route
        if (cleanRoute && cleanRoute !== '/') {
          cleanRoute = cleanRoute.replace(/\/$/, '');
        }

        if (cleanRoute && cleanRoute.startsWith('/')) {
          coveredRoutes.add(cleanRoute);
        }
      }
    }
  }

  return Array.from(coveredRoutes);
}

/**
 * Calculate coverage
 */
function calculateCoverage() {
  const routes = extractRoutes();
  const coveredRoutes = extractCoveredRoutes();

  if (CONFIG.verbose) {
    console.log('\n=== E2E Coverage Report ===\n');
    console.log(`Total routes: ${routes.length}`);
    console.log(`Covered routes: ${coveredRoutes.length}`);
  }

  // Match covered routes to actual routes
  const matchedRoutes = [];
  const unmatchedRoutes = [];

  for (const route of routes) {
    const isMatched = coveredRoutes.some(covered => {
      // Exact match
      if (route.path === covered) return true;

      // Match with dynamic segments
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(covered);
    });

    if (isMatched) {
      matchedRoutes.push(route);
    } else {
      unmatchedRoutes.push(route);
    }
  }

  const coverage = routes.length > 0
    ? Math.round((matchedRoutes.length / routes.length) * 100)
    : 0;

  const result = {
    coverage,
    total_routes: routes.length,
    covered_routes: matchedRoutes.length,
    uncovered_routes: unmatchedRoutes.length,
    timestamp: new Date().toISOString(),
    routes: routes.map(r => r.path),
    covered: matchedRoutes.map(r => r.path),
    uncovered: unmatchedRoutes.map(r => r.path)
  };

  // Write to file
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(result, null, 2));

  if (CONFIG.verbose) {
    console.log(`\nCoverage: ${coverage}%\n`);
    console.log('Covered routes:');
    matchedRoutes.forEach(r => console.log(`  ✅ ${r.path}`));
    console.log('\nUncovered routes:');
    unmatchedRoutes.forEach(r => console.log(`  ❌ ${r.path}`));
    console.log(`\nReport saved to: ${CONFIG.outputFile}`);
  }

  // Print summary to stdout (for CI)
  console.log(JSON.stringify({
    coverage: result.coverage,
    total_routes: result.total_routes,
    covered_routes: result.covered_routes
  }));

  return result;
}

// Main execution
if (require.main === module) {
  try {
    calculateCoverage();
  } catch (error) {
    console.error('Error calculating E2E coverage:', error);
    process.exit(1);
  }
}

module.exports = { calculateCoverage, extractRoutes, extractCoveredRoutes };
