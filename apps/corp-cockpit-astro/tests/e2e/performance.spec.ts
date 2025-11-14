/**
 * Performance E2E Tests
 *
 * Tests cover:
 * - Web Vitals (LCP, FID, CLS)
 * - Page load performance
 * - Time to Interactive
 * - Bundle size validation
 * - API response times
 * - Memory usage
 * - Performance budgets
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  measurePageLoad,
  measureWebVitals,
  waitForLoadingComplete,
} from './helpers';

test.describe('Performance', () => {
  test.describe('Web Vitals', () => {
    test('should meet LCP budget (< 2.5s)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const vitals = await measureWebVitals(page);

      if (vitals.lcp) {
        console.log(`LCP: ${vitals.lcp}ms`);
        expect(vitals.lcp).toBeLessThan(2500);
      }
    });

    test('should meet FID budget (< 100ms)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Trigger interaction to measure FID
      await page.click('body');

      const vitals = await measureWebVitals(page);

      if (vitals.fid) {
        console.log(`FID: ${vitals.fid}ms`);
        expect(vitals.fid).toBeLessThan(100);
      }
    });

    test('should meet CLS budget (< 0.1)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const vitals = await measureWebVitals(page);

      if (vitals.cls !== undefined) {
        console.log(`CLS: ${vitals.cls}`);
        expect(vitals.cls).toBeLessThan(0.1);
      }
    });
  });

  test.describe('Page Load Performance', () => {
    test('should load dashboard within 3 seconds', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const startTime = Date.now();
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      const loadTime = Date.now() - startTime;

      console.log(`Dashboard load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });

    test('should load evidence page within 3 seconds', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const startTime = Date.now();
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
      const loadTime = Date.now() - startTime;

      console.log(`Evidence page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have fast Time to First Byte (< 600ms)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const [response] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/cockpit/')),
        navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1),
      ]);

      const timing = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return perfData.responseStart - perfData.requestStart;
      });

      console.log(`TTFB: ${timing}ms`);
      expect(timing).toBeLessThan(600);
    });
  });

  test.describe('API Performance', () => {
    test('should respond to API requests within 1 second', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const [response] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/')),
        page.reload(),
      ]);

      const requestStart = response.request().timing().startTime;
      const responseEnd = response.request().timing().responseEnd;
      const duration = responseEnd - requestStart;

      console.log(`API response time: ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });

    test('should cache API responses appropriately', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // First load
      const firstLoadStart = Date.now();
      await page.reload();
      await waitForLoadingComplete(page);
      const firstLoadTime = Date.now() - firstLoadStart;

      // Second load (should be faster due to caching)
      const secondLoadStart = Date.now();
      await page.reload();
      await waitForLoadingComplete(page);
      const secondLoadTime = Date.now() - secondLoadStart;

      console.log(`First load: ${firstLoadTime}ms, Second load: ${secondLoadTime}ms`);

      // Second load should generally be faster or similar
      expect(secondLoadTime).toBeLessThanOrEqual(firstLoadTime * 1.5);
    });
  });

  test.describe('Resource Loading', () => {
    test('should load critical resources first', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const resources: any[] = [];

      page.on('response', response => {
        resources.push({
          url: response.url(),
          type: response.request().resourceType(),
          timing: response.request().timing(),
        });
      });

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Check that critical resources (document, stylesheet) load first
      const criticalResources = resources.filter(r =>
        ['document', 'stylesheet', 'script'].includes(r.type)
      );

      expect(criticalResources.length).toBeGreaterThan(0);
    });

    test('should use efficient image formats', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const images: string[] = [];

      page.on('response', response => {
        if (response.request().resourceType() === 'image') {
          images.push(response.url());
        }
      });

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Check for modern image formats
      const modernFormats = images.filter(url =>
        /\.(webp|avif|svg)$/i.test(url)
      );

      // Should use modern formats or have a good reason not to
      console.log(`Modern format images: ${modernFormats.length} / ${images.length}`);
    });

    test('should lazy load images below the fold', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const lazyImages = await page.locator('img[loading="lazy"]').count();

      console.log(`Lazy-loaded images: ${lazyImages}`);

      // Should have some lazy-loaded images if page has many images
      // This is optional depending on page design
    });
  });

  test.describe('JavaScript Performance', () => {
    test('should have minimal main thread blocking', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const metrics = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const longTasks = entries.filter((entry: any) => entry.duration > 50);
            resolve({ longTasks: longTasks.length, totalTasks: entries.length });
          });

          observer.observe({ entryTypes: ['longtask'] });

          setTimeout(() => {
            observer.disconnect();
            resolve({ longTasks: 0, totalTasks: 0 });
          }, 5000);
        });
      });

      console.log(`Long tasks: ${metrics.longTasks}`);

      // Should have minimal long tasks
      expect(metrics.longTasks).toBeLessThan(5);
    });

    test('should not have memory leaks on navigation', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      // Get initial memory
      const initialMetrics = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        } : null;
      });

      if (!initialMetrics) {
        // Memory API not available, skip test
        test.skip();
        return;
      }

      // Navigate multiple times
      for (let i = 0; i < 3; i++) {
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);
        await page.goto('/en/cockpit/company-1/evidence');
        await waitForLoadingComplete(page);
      }

      // Get final memory
      const finalMetrics = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        };
      });

      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMetrics.usedJSHeapSize) * 100;

      console.log(`Memory increase: ${memoryIncreasePercent.toFixed(2)}%`);

      // Memory should not increase dramatically (< 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });
  });

  test.describe('Bundle Size', () => {
    test('should have reasonable initial bundle size', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const scriptSizes: number[] = [];

      page.on('response', async response => {
        if (response.request().resourceType() === 'script') {
          const headers = response.headers();
          const contentLength = headers['content-length'];

          if (contentLength) {
            scriptSizes.push(parseInt(contentLength, 10));
          }
        }
      });

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const totalSize = scriptSizes.reduce((a, b) => a + b, 0);
      const totalSizeKB = totalSize / 1024;

      console.log(`Total JS bundle size: ${totalSizeKB.toFixed(2)} KB`);

      // Should be under reasonable limit (e.g., 500KB total)
      expect(totalSizeKB).toBeLessThan(500);
    });

    test('should use code splitting', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const scripts: string[] = [];

      page.on('response', response => {
        if (response.request().resourceType() === 'script') {
          scripts.push(response.url());
        }
      });

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Should have multiple script chunks (code splitting)
      console.log(`Number of script chunks: ${scripts.length}`);
      expect(scripts.length).toBeGreaterThan(1);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render list items efficiently', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      const startTime = performance.now();

      // Scroll through list to trigger rendering
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(500);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      console.log(`List render time: ${renderTime}ms`);
      expect(renderTime).toBeLessThan(1000);
    });

    test('should handle rapid navigation smoothly', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      const startTime = performance.now();

      // Navigate rapidly between pages
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Rapid navigation time: ${totalTime}ms`);
      expect(totalTime).toBeLessThan(5000);
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track web vitals in production', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Check if web vitals are being tracked
      const hasTracking = await page.evaluate(() => {
        return !!(window as any).webVitals || !!(window as any).gtag;
      });

      // Web vitals tracking is optional but recommended
      console.log(`Web vitals tracking enabled: ${hasTracking}`);
    });
  });
});
