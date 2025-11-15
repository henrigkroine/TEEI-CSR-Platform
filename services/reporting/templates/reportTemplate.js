"use strict";
/**
 * Report HTML Template Generator
 *
 * Generates professional HTML templates for PDF rendering
 * Supports multiple report types with consistent styling
 *
 * @module reportTemplate
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
exports.generateReportHTML = generateReportHTML;
/**
 * Generate complete HTML for report PDF
 */
function generateReportHTML(report_1) {
    return __awaiter(this, arguments, void 0, function (report, options) {
        var theme, primaryColor, secondaryColor;
        var _a;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_b) {
            theme = options.theme || {};
            primaryColor = theme.primaryColor || '#6366f1';
            secondaryColor = theme.secondaryColor || '#8b5cf6';
            return [2 /*return*/, "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>".concat(((_a = report.metadata) === null || _a === void 0 ? void 0 : _a.companyName) || 'CSR Impact Report', "</title>\n  <style>\n    ").concat(generateCSS(primaryColor, secondaryColor), "\n  </style>\n</head>\n<body>\n  ").concat(generateCoverPage(report, options), "\n  ").concat(options.includeTableOfContents !== false ? generateTableOfContents(report) : '', "\n  ").concat(generateSections(report, options), "\n  ").concat(options.includeCitations !== false ? generateCitationsSection(report) : '', "\n</body>\n</html>\n  ").trim()];
        });
    });
}
/**
 * Generate CSS for PDF styling
 */
function generateCSS(primaryColor, secondaryColor) {
    return "\n    * {\n      margin: 0;\n      padding: 0;\n      box-sizing: border-box;\n    }\n\n    @page {\n      size: A4;\n      margin: 20mm 15mm;\n    }\n\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n      font-size: 11pt;\n      line-height: 1.6;\n      color: #1f2937;\n    }\n\n    h1 {\n      font-size: 28pt;\n      font-weight: 700;\n      color: ".concat(primaryColor, ";\n      margin-bottom: 16pt;\n      line-height: 1.2;\n    }\n\n    h2 {\n      font-size: 20pt;\n      font-weight: 600;\n      color: ").concat(primaryColor, ";\n      margin-top: 24pt;\n      margin-bottom: 12pt;\n      border-bottom: 2pt solid ").concat(primaryColor, ";\n      padding-bottom: 4pt;\n      page-break-after: avoid;\n    }\n\n    h3 {\n      font-size: 16pt;\n      font-weight: 600;\n      color: ").concat(secondaryColor, ";\n      margin-top: 16pt;\n      margin-bottom: 8pt;\n      page-break-after: avoid;\n    }\n\n    p {\n      margin-bottom: 10pt;\n      text-align: justify;\n    }\n\n    .cover-page {\n      height: 100vh;\n      display: flex;\n      flex-direction: column;\n      justify-content: center;\n      align-items: center;\n      text-align: center;\n      page-break-after: always;\n      background: linear-gradient(135deg, ").concat(primaryColor, " 0%, ").concat(secondaryColor, " 100%);\n      color: white;\n      padding: 40pt;\n    }\n\n    .cover-page h1 {\n      color: white;\n      font-size: 36pt;\n      margin-bottom: 24pt;\n    }\n\n    .cover-page .subtitle {\n      font-size: 18pt;\n      margin-bottom: 12pt;\n      opacity: 0.9;\n    }\n\n    .cover-page .period {\n      font-size: 14pt;\n      opacity: 0.8;\n    }\n\n    .cover-page .logo {\n      max-width: 200pt;\n      max-height: 80pt;\n      margin-bottom: 32pt;\n      filter: brightness(0) invert(1);\n    }\n\n    .toc {\n      page-break-after: always;\n      margin-top: 20pt;\n    }\n\n    .toc h2 {\n      color: ").concat(primaryColor, ";\n      font-size: 24pt;\n      margin-bottom: 16pt;\n    }\n\n    .toc-item {\n      display: flex;\n      justify-content: space-between;\n      padding: 6pt 0;\n      border-bottom: 1pt dotted #e5e7eb;\n    }\n\n    .toc-item:last-child {\n      border-bottom: none;\n    }\n\n    .section {\n      margin-bottom: 24pt;\n      page-break-inside: avoid;\n    }\n\n    .executive-summary {\n      background: #f9fafb;\n      border-left: 4pt solid ").concat(primaryColor, ";\n      padding: 16pt;\n      margin: 16pt 0;\n      page-break-inside: avoid;\n    }\n\n    .metric-card {\n      display: inline-block;\n      width: 48%;\n      margin: 1%;\n      padding: 12pt;\n      background: white;\n      border: 1pt solid #e5e7eb;\n      border-radius: 4pt;\n      page-break-inside: avoid;\n    }\n\n    .metric-label {\n      font-size: 9pt;\n      color: #6b7280;\n      text-transform: uppercase;\n      letter-spacing: 0.5pt;\n      margin-bottom: 4pt;\n    }\n\n    .metric-value {\n      font-size: 24pt;\n      font-weight: 700;\n      color: ").concat(primaryColor, ";\n    }\n\n    .chart-container {\n      margin: 16pt 0;\n      text-align: center;\n      page-break-inside: avoid;\n    }\n\n    .chart-container img {\n      max-width: 100%;\n      height: auto;\n    }\n\n    .chart-caption {\n      font-size: 9pt;\n      color: #6b7280;\n      margin-top: 8pt;\n      font-style: italic;\n    }\n\n    .citation {\n      color: ").concat(primaryColor, ";\n      font-weight: 600;\n      text-decoration: none;\n    }\n\n    .citations-section {\n      page-break-before: always;\n      margin-top: 20pt;\n    }\n\n    .citation-item {\n      margin-bottom: 12pt;\n      padding-left: 20pt;\n      text-indent: -20pt;\n    }\n\n    .citation-number {\n      color: ").concat(primaryColor, ";\n      font-weight: 600;\n    }\n\n    .evidence-snippet {\n      background: #f9fafb;\n      padding: 8pt;\n      margin: 8pt 0;\n      border-left: 3pt solid #e5e7eb;\n      font-size: 10pt;\n      font-style: italic;\n      page-break-inside: avoid;\n    }\n\n    .confidence-badge {\n      display: inline-block;\n      padding: 2pt 6pt;\n      border-radius: 3pt;\n      font-size: 8pt;\n      font-weight: 600;\n      text-transform: uppercase;\n    }\n\n    .confidence-high {\n      background: #d1fae5;\n      color: #065f46;\n    }\n\n    .confidence-medium {\n      background: #fef3c7;\n      color: #92400e;\n    }\n\n    .confidence-low {\n      background: #fee2e2;\n      color: #991b1b;\n    }\n\n    blockquote {\n      border-left: 3pt solid ").concat(primaryColor, ";\n      padding-left: 12pt;\n      margin: 12pt 0;\n      font-style: italic;\n      color: #4b5563;\n    }\n\n    ul, ol {\n      margin-left: 20pt;\n      margin-bottom: 10pt;\n    }\n\n    li {\n      margin-bottom: 4pt;\n    }\n\n    table {\n      width: 100%;\n      border-collapse: collapse;\n      margin: 12pt 0;\n      page-break-inside: avoid;\n    }\n\n    th, td {\n      padding: 8pt;\n      text-align: left;\n      border-bottom: 1pt solid #e5e7eb;\n    }\n\n    th {\n      background: ").concat(primaryColor, ";\n      color: white;\n      font-weight: 600;\n    }\n\n    .page-break {\n      page-break-after: always;\n    }\n\n    @media print {\n      body {\n        background: white;\n      }\n\n      .no-print {\n        display: none;\n      }\n    }\n  ");
}
/**
 * Generate cover page
 */
function generateCoverPage(report, options) {
    var _a, _b;
    var logoHTML = ((_a = options.theme) === null || _a === void 0 ? void 0 : _a.logo)
        ? "<img src=\"".concat(options.theme.logo, "\" class=\"logo\" alt=\"Company Logo\" />")
        : '';
    var companyName = ((_b = report.metadata) === null || _b === void 0 ? void 0 : _b.companyName) || 'Your Company';
    var reportType = getReportTypeLabel(report.reportType);
    var period = formatPeriod(report.period);
    return "\n    <div class=\"cover-page\">\n      ".concat(logoHTML, "\n      <h1>").concat(companyName, "</h1>\n      <div class=\"subtitle\">").concat(reportType, "</div>\n      <div class=\"period\">").concat(period, "</div>\n    </div>\n  ");
}
/**
 * Generate table of contents
 */
function generateTableOfContents(report) {
    if (!report.sections || report.sections.length === 0) {
        return '';
    }
    var items = report.sections
        .map(function (section, index) {
        return "\n        <div class=\"toc-item\">\n          <span>".concat(index + 1, ". ").concat(section.title, "</span>\n          <span>").concat(index + 2, "</span>\n        </div>\n      ");
    })
        .join('');
    return "\n    <div class=\"toc\">\n      <h2>Table of Contents</h2>\n      ".concat(items, "\n    </div>\n  ");
}
/**
 * Generate report sections
 */
function generateSections(report, options) {
    if (!report.sections || report.sections.length === 0) {
        return '<p>No content available.</p>';
    }
    return report.sections
        .sort(function (a, b) { return a.order - b.order; })
        .map(function (section) { return generateSection(section, options); })
        .join('\n');
}
/**
 * Generate individual section
 */
function generateSection(section, options) {
    var sectionClass = section.order === 0 ? 'executive-summary' : 'section';
    // Process narrative to add citation links
    var narrative = section.narrative || '';
    if (options.includeCitations !== false && section.citations) {
        narrative = processCitations(narrative, section.citations);
    }
    // Generate charts if present
    var chartsHTML = section.charts && options.includeCharts && options.chartImages
        ? section.charts.map(function (chart, index) {
            var key = "".concat(section.order, "-").concat(index);
            var chartImage = options.chartImages[key];
            return chartImage ? generateChartHTML(chart, chartImage) : '';
        }).join('')
        : '';
    return "\n    <div class=\"".concat(sectionClass, "\">\n      <h2>").concat(section.title, "</h2>\n      ").concat(narrative, "\n      ").concat(chartsHTML, "\n    </div>\n  ");
}
/**
 * Process citations in narrative text
 */
function processCitations(narrative, citations) {
    // Replace [evidence-{id}] with styled citation links
    return narrative.replace(/\[evidence-([^\]]+)\]/g, function (match, id) {
        var citation = citations.find(function (c) { return c.evidenceId === id; });
        if (citation) {
            return "<span class=\"citation\" title=\"".concat(citation.snippet, "\">[").concat(id, "]</span>");
        }
        return match;
    });
}
/**
 * Generate chart HTML
 */
function generateChartHTML(chart, base64Image) {
    return "\n    <div class=\"chart-container\">\n      <img src=\"".concat(base64Image, "\" alt=\"").concat(chart.title || 'Chart', "\" />\n      ").concat(chart.title ? "<div class=\"chart-caption\">".concat(chart.title, "</div>") : '', "\n    </div>\n  ");
}
/**
 * Generate citations section
 */
function generateCitationsSection(report) {
    var allCitations = [];
    // Collect all citations from all sections
    if (report.sections) {
        for (var _i = 0, _a = report.sections; _i < _a.length; _i++) {
            var section = _a[_i];
            if (section.citations && section.citations.length > 0) {
                allCitations.push.apply(allCitations, section.citations);
            }
        }
    }
    if (allCitations.length === 0) {
        return '';
    }
    // Remove duplicates
    var uniqueCitations = Array.from(new Map(allCitations.map(function (c) { return [c.evidenceId, c]; })).values());
    var citationsHTML = uniqueCitations
        .map(function (citation, index) {
        var confidenceLevel = citation.confidence >= 0.8 ? 'high' : citation.confidence >= 0.5 ? 'medium' : 'low';
        var confidenceLabel = confidenceLevel === 'high' ? 'High' : confidenceLevel === 'medium' ? 'Medium' : 'Low';
        return "\n        <div class=\"citation-item\">\n          <span class=\"citation-number\">[".concat(citation.evidenceId, "]</span>\n          <span class=\"confidence-badge confidence-").concat(confidenceLevel, "\">").concat(confidenceLabel, " Confidence</span>\n          <div class=\"evidence-snippet\">\"").concat(citation.snippet, "\"</div>\n          <div style=\"font-size: 9pt; color: #6b7280;\">\n            Source: ").concat(citation.sourceType, " | Date: ").concat(new Date(citation.dateCollected).toLocaleDateString(), "\n          </div>\n        </div>\n      ");
    })
        .join('');
    return "\n    <div class=\"citations-section\">\n      <h2>Evidence References</h2>\n      <p>The following evidence snippets support the claims made in this report. All evidence has been anonymized to protect participant privacy.</p>\n      ".concat(citationsHTML, "\n    </div>\n  ");
}
/**
 * Get human-readable report type label
 */
function getReportTypeLabel(type) {
    var labels = {
        quarterly: 'Quarterly CSR Impact Report',
        annual: 'Annual CSR Impact Report',
        board_presentation: 'Board Presentation - CSR Overview',
        csrd: 'CSRD Compliance Report',
    };
    return labels[type] || 'CSR Impact Report';
}
/**
 * Format date period
 */
function formatPeriod(period) {
    if (!period) {
        return '';
    }
    var from = new Date(period.from).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    var to = new Date(period.to).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    return "".concat(from, " - ").concat(to);
}
