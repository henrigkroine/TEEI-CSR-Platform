"use strict";
/**
 * Chart Renderer Service
 *
 * Server-side chart rendering for PDF exports
 * Converts chart data to base64-encoded PNG images
 *
 * @module chartRenderer
 */
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
exports.renderChartToBase64 = renderChartToBase64;
exports.renderChartWithNodeCanvas = renderChartWithNodeCanvas;
var playwright_1 = require("playwright");
/**
 * Render chart to base64-encoded PNG
 * Uses Playwright to screenshot a chart component
 */
function renderChartToBase64(chart) {
    return __awaiter(this, void 0, void 0, function () {
        var browser, html, page, element, screenshot, base64, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    browser = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 14]);
                    html = generateChartHTML(chart);
                    return [4 /*yield*/, playwright_1.chromium.launch({ headless: true })];
                case 2:
                    // Launch browser
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newPage()];
                case 3:
                    page = _a.sent();
                    // Set viewport
                    return [4 /*yield*/, page.setViewportSize({ width: 800, height: 500 })];
                case 4:
                    // Set viewport
                    _a.sent();
                    // Load HTML
                    return [4 /*yield*/, page.setContent(html, { waitUntil: 'networkidle' })];
                case 5:
                    // Load HTML
                    _a.sent();
                    // Wait for chart to render
                    return [4 /*yield*/, page.waitForSelector('#chart-container', { timeout: 5000 })];
                case 6:
                    // Wait for chart to render
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 7:
                    _a.sent(); // Brief pause for animations
                    return [4 /*yield*/, page.$('#chart-container')];
                case 8:
                    element = _a.sent();
                    if (!element) {
                        throw new Error('Chart container not found');
                    }
                    return [4 /*yield*/, element.screenshot({ type: 'png' })];
                case 9:
                    screenshot = _a.sent();
                    return [4 /*yield*/, browser.close()];
                case 10:
                    _a.sent();
                    base64 = screenshot.toString('base64');
                    return [2 /*return*/, "data:image/png;base64,".concat(base64)];
                case 11:
                    error_1 = _a.sent();
                    if (!browser) return [3 /*break*/, 13];
                    return [4 /*yield*/, browser.close()];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13:
                    console.error('[Chart Renderer] Error:', error_1.message);
                    // Return placeholder image on error
                    return [2 /*return*/, generatePlaceholderImage(chart.title || 'Chart')];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate HTML for chart rendering
 * Uses QuickChart.io as a simple solution (no complex dependencies)
 */
function generateChartHTML(chart) {
    // For simplicity, we'll use QuickChart.io URL-based rendering
    // This avoids complex server-side chart libraries
    var chartConfig = buildQuickChartConfig(chart);
    var chartUrl = "https://quickchart.io/chart?c=".concat(encodeURIComponent(JSON.stringify(chartConfig)));
    return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body {\n      margin: 0;\n      padding: 20px;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      background: white;\n    }\n    #chart-container {\n      width: 760px;\n      height: 460px;\n    }\n    img {\n      max-width: 100%;\n      max-height: 100%;\n    }\n  </style>\n</head>\n<body>\n  <div id=\"chart-container\">\n    <img src=\"".concat(chartUrl, "\" alt=\"").concat(chart.title || 'Chart', "\" />\n  </div>\n</body>\n</html>\n  ");
}
/**
 * Build Chart.js configuration for QuickChart
 */
function buildQuickChartConfig(chart) {
    var type = chart.type, data = chart.data, title = chart.title;
    // Map our chart types to Chart.js types
    var chartType = mapChartType(type);
    return {
        type: chartType,
        data: {
            labels: data.labels || [],
            datasets: data.datasets || [],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: !!title,
                text: title || '',
                fontSize: 16,
                fontColor: '#1f2937',
            },
            legend: {
                display: true,
                position: 'bottom',
            },
            scales: chartType !== 'pie' && chartType !== 'doughnut'
                ? {
                    yAxes: [
                        {
                            ticks: {
                                beginAtZero: true,
                            },
                        },
                    ],
                }
                : undefined,
        },
    };
}
/**
 * Map our chart types to Chart.js types
 */
function mapChartType(type) {
    var typeMap = {
        bar: 'bar',
        line: 'line',
        pie: 'pie',
        doughnut: 'doughnut',
        area: 'line', // Area charts are line charts with fill
    };
    return typeMap[type] || 'bar';
}
/**
 * Generate placeholder image for failed chart renders
 */
function generatePlaceholderImage(title) {
    // SVG placeholder
    var svg = "\n    <svg width=\"800\" height=\"500\" xmlns=\"http://www.w3.org/2000/svg\">\n      <rect width=\"800\" height=\"500\" fill=\"#f3f4f6\"/>\n      <text x=\"400\" y=\"250\" font-family=\"Arial\" font-size=\"18\" fill=\"#6b7280\" text-anchor=\"middle\">\n        Chart: ".concat(title, "\n      </text>\n      <text x=\"400\" y=\"280\" font-family=\"Arial\" font-size=\"14\" fill=\"#9ca3af\" text-anchor=\"middle\">\n        (Preview not available)\n      </text>\n    </svg>\n  ").trim();
    var base64 = Buffer.from(svg).toString('base64');
    return "data:image/svg+xml;base64,".concat(base64);
}
/**
 * Alternative: Render chart using Chart.js + node-canvas (if QuickChart unavailable)
 * This requires installing canvas package: npm install canvas chart.js
 */
function renderChartWithNodeCanvas(chart) {
    return __awaiter(this, void 0, void 0, function () {
        var createCanvas, Chart, canvas, ctx, chartConfig, buffer, base64, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('canvas'); })];
                case 1:
                    createCanvas = (_a.sent()).createCanvas;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('chart.js/auto'); })];
                case 2:
                    Chart = (_a.sent()).Chart;
                    canvas = createCanvas(800, 500);
                    ctx = canvas.getContext('2d');
                    chartConfig = buildQuickChartConfig(chart);
                    new Chart(ctx, chartConfig);
                    buffer = canvas.toBuffer('image/png');
                    base64 = buffer.toString('base64');
                    return [2 /*return*/, "data:image/png;base64,".concat(base64)];
                case 3:
                    error_2 = _a.sent();
                    console.error('[Chart Renderer] node-canvas fallback failed:', error_2.message);
                    return [2 /*return*/, generatePlaceholderImage(chart.title || 'Chart')];
                case 4: return [2 /*return*/];
            }
        });
    });
}
