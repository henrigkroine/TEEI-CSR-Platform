"use strict";
/**
 * PDF Renderer Service
 *
 * Server-side PDF generation for CSR reports using Playwright
 * Supports company branding, charts, citations, and professional layouts
 *
 * @module pdfRenderer
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReportToPDF = renderReportToPDF;
exports.getCachedOrRenderPDF = getCachedOrRenderPDF;
exports.clearPDFCache = clearPDFCache;
exports.getPDFCacheStats = getPDFCacheStats;
var playwright_1 = require("playwright");
var reportTemplate_1 = require("../templates/reportTemplate");
var chartRenderer_1 = require("./chartRenderer");
/**
 * Main PDF rendering function
 * Converts a GeneratedReport to a professionally formatted PDF
 */
function renderReportToPDF(report_1) {
    return __awaiter(this, arguments, void 0, function (report, options) {
        var startTime, browser, chartImages, _i, _a, section, i, chart, key, _b, _c, html, page, pdfBuffer, renderTime, pageCount, error_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    startTime = Date.now();
                    browser = null;
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 17, , 20]);
                    chartImages = {};
                    if (!(options.includeCharts && report.sections)) return [3 /*break*/, 7];
                    _i = 0, _a = report.sections;
                    _d.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    section = _a[_i];
                    if (!section.charts) return [3 /*break*/, 6];
                    i = 0;
                    _d.label = 3;
                case 3:
                    if (!(i < section.charts.length)) return [3 /*break*/, 6];
                    chart = section.charts[i];
                    key = "".concat(section.order, "-").concat(i);
                    _b = chartImages;
                    _c = key;
                    return [4 /*yield*/, (0, chartRenderer_1.renderChartToBase64)(chart)];
                case 4:
                    _b[_c] = _d.sent();
                    _d.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [4 /*yield*/, (0, reportTemplate_1.generateReportHTML)(report, __assign(__assign({}, options), { chartImages: chartImages }))];
                case 8:
                    html = _d.sent();
                    return [4 /*yield*/, playwright_1.chromium.launch({
                            headless: true,
                            args: [
                                '--no-sandbox',
                                '--disable-setuid-sandbox',
                                '--disable-dev-shm-usage', // Prevent memory issues in Docker
                            ],
                        })];
                case 9:
                    // 3. Launch headless browser
                    browser = _d.sent();
                    return [4 /*yield*/, browser.newPage()];
                case 10:
                    page = _d.sent();
                    // 4. Set viewport for consistent rendering
                    return [4 /*yield*/, page.setViewportSize({ width: 1200, height: 1600 })];
                case 11:
                    // 4. Set viewport for consistent rendering
                    _d.sent();
                    // 5. Load HTML content
                    return [4 /*yield*/, page.setContent(html, {
                            waitUntil: 'networkidle',
                            timeout: 30000,
                        })];
                case 12:
                    // 5. Load HTML content
                    _d.sent();
                    // 6. Wait for any custom fonts to load
                    return [4 /*yield*/, page.waitForLoadState('domcontentloaded')];
                case 13:
                    // 6. Wait for any custom fonts to load
                    _d.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 14:
                    _d.sent(); // Brief pause for font rendering
                    return [4 /*yield*/, page.pdf({
                            format: 'A4',
                            printBackground: true,
                            margin: {
                                top: '20mm',
                                right: '15mm',
                                bottom: '20mm',
                                left: '15mm',
                            },
                            displayHeaderFooter: true,
                            headerTemplate: generateHeaderTemplate(report, options.theme),
                            footerTemplate: generateFooterTemplate(report, options.watermark),
                            preferCSSPageSize: false,
                        })];
                case 15:
                    pdfBuffer = _d.sent();
                    renderTime = Date.now() - startTime;
                    pageCount = estimatePageCount(pdfBuffer);
                    return [4 /*yield*/, browser.close()];
                case 16:
                    _d.sent();
                    return [2 /*return*/, {
                            buffer: pdfBuffer,
                            metadata: {
                                pageCount: pageCount,
                                fileSize: pdfBuffer.length,
                                renderTime: renderTime,
                            },
                        }];
                case 17:
                    error_1 = _d.sent();
                    if (!browser) return [3 /*break*/, 19];
                    return [4 /*yield*/, browser.close()];
                case 18:
                    _d.sent();
                    _d.label = 19;
                case 19: throw new Error("PDF rendering failed: ".concat(error_1.message));
                case 20: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate header template for PDF
 * Includes company logo and report title
 */
function generateHeaderTemplate(report, theme) {
    var _a;
    var logoHTML = (theme === null || theme === void 0 ? void 0 : theme.logo)
        ? "<img src=\"".concat(theme.logo, "\" style=\"height: 30px; margin-right: 10px;\" />")
        : '';
    var primaryColor = (theme === null || theme === void 0 ? void 0 : theme.primaryColor) || '#6366f1';
    return "\n    <div style=\"width: 100%; padding: 10px 15mm; font-size: 10px; color: #666; border-bottom: 2px solid ".concat(primaryColor, "; display: flex; align-items: center;\">\n      ").concat(logoHTML, "\n      <span style=\"flex: 1;\">").concat(((_a = report.metadata) === null || _a === void 0 ? void 0 : _a.companyName) || 'CSR Impact Report', "</span>\n      <span style=\"font-size: 8px; color: #999;\">Page <span class=\"pageNumber\"></span></span>\n    </div>\n  ");
}
/**
 * Generate footer template for PDF
 * Includes page numbers, generation timestamp, and optional watermark
 */
function generateFooterTemplate(report, watermark) {
    var _a;
    var generatedDate = new Date(((_a = report.metadata) === null || _a === void 0 ? void 0 : _a.generatedAt) || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    var watermarkHTML = watermark
        ? "<div style=\"position: absolute; left: 50%; transform: translateX(-50%); font-size: 18px; color: rgba(0,0,0,0.1); font-weight: bold; text-transform: uppercase;\">".concat(watermark, "</div>")
        : '';
    return "\n    <div style=\"width: 100%; padding: 10px 15mm; font-size: 8px; color: #999; border-top: 1px solid #e5e7eb; position: relative;\">\n      ".concat(watermarkHTML, "\n      <div style=\"display: flex; justify-content: space-between; align-items: center;\">\n        <span>Generated: ").concat(generatedDate, "</span>\n        <span>Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></span>\n        <span>TEEI CSR Platform</span>\n      </div>\n    </div>\n  ");
}
/**
 * Estimate page count from PDF buffer
 * Looks for /Type /Page occurrences in PDF structure
 */
function estimatePageCount(buffer) {
    var pdfString = buffer.toString('latin1');
    var matches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 1;
}
var defaultCacheConfig = {
    enabled: process.env.PDF_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.PDF_CACHE_TTL || '3600', 10), // 1 hour default
    maxSize: parseInt(process.env.PDF_CACHE_MAX_SIZE_MB || '100', 10),
};
/**
 * In-memory PDF cache (for development/simple deployments)
 * For production, use Redis or S3
 */
var pdfCache = new Map();
/**
 * Get cached PDF or render new one
 */
function getCachedOrRenderPDF(reportId_1, report_1) {
    return __awaiter(this, arguments, void 0, function (reportId, report, options) {
        var cacheKey, cached, age, result;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "".concat(reportId, "-").concat(JSON.stringify(options));
                    // Check cache
                    if (defaultCacheConfig.enabled) {
                        cached = pdfCache.get(cacheKey);
                        if (cached) {
                            age = Date.now() - cached.timestamp;
                            if (age < defaultCacheConfig.ttl * 1000) {
                                console.log("[PDF] Cache hit for report ".concat(reportId));
                                return [2 /*return*/, {
                                        buffer: cached.buffer,
                                        metadata: {
                                            pageCount: estimatePageCount(cached.buffer),
                                            fileSize: cached.buffer.length,
                                            renderTime: 0, // Cached, instant
                                        },
                                    }];
                            }
                            else {
                                // Expired, remove from cache
                                pdfCache.delete(cacheKey);
                            }
                        }
                    }
                    // Render new PDF
                    console.log("[PDF] Rendering report ".concat(reportId));
                    return [4 /*yield*/, renderReportToPDF(report, options)];
                case 1:
                    result = _a.sent();
                    // Cache result
                    if (defaultCacheConfig.enabled) {
                        pdfCache.set(cacheKey, {
                            buffer: result.buffer,
                            timestamp: Date.now(),
                        });
                        // Simple cache size management (evict oldest if over limit)
                        manageCacheSize();
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Manage cache size by evicting oldest entries
 */
function manageCacheSize() {
    var maxSizeBytes = defaultCacheConfig.maxSize * 1024 * 1024;
    var totalSize = 0;
    // Calculate total cache size
    for (var _i = 0, _a = pdfCache.values(); _i < _a.length; _i++) {
        var entry = _a[_i];
        totalSize += entry.buffer.length;
    }
    // Evict oldest entries if over limit
    if (totalSize > maxSizeBytes) {
        var entries = Array.from(pdfCache.entries());
        entries.sort(function (a, b) { return a[1].timestamp - b[1].timestamp; });
        while (totalSize > maxSizeBytes && entries.length > 0) {
            var _b = entries.shift(), key = _b[0], value = _b[1];
            totalSize -= value.buffer.length;
            pdfCache.delete(key);
            console.log("[PDF] Evicted cached PDF: ".concat(key));
        }
    }
}
/**
 * Clear PDF cache (for testing or manual cleanup)
 */
function clearPDFCache() {
    pdfCache.clear();
    console.log('[PDF] Cache cleared');
}
/**
 * Get cache statistics
 */
function getPDFCacheStats() {
    var totalSize = 0;
    for (var _i = 0, _a = pdfCache.values(); _i < _a.length; _i++) {
        var entry = _a[_i];
        totalSize += entry.buffer.length;
    }
    return {
        entries: pdfCache.size,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        maxSizeMB: defaultCacheConfig.maxSize,
        ttl: defaultCacheConfig.ttl,
    };
}
