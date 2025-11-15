"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.getSDGDistribution = getSDGDistribution;
exports.getEventsBySDG = getEventsBySDG;
exports.getSDGCoverageReport = getSDGCoverageReport;
exports.getQuarterlySDGReport = getQuarterlySDGReport;
exports.getSDGBreakdownByEventType = getSDGBreakdownByEventType;
var shared_schema_1 = require("@teei/shared-schema");
var drizzle_orm_1 = require("drizzle-orm");
var shared_utils_1 = require("@teei/shared-utils");
var sdg_mappings_json_1 = require("../config/sdg-mappings.json");
var logger = (0, shared_utils_1.createServiceLogger)('buddy-connector:sdg-queries');
/**
 * Get SDG distribution for a given time period
 * Returns count of events for each SDG goal
 */
function getSDGDistribution(startDate, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var conditions, events, sdgCounts, _i, events_1, event_1, sdgs, _a, sdgs_1, sdg, distribution, _b, _c, _d, sdg, count, reference;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    logger.info({ startDate: startDate, endDate: endDate }, 'Fetching SDG distribution');
                    conditions = [];
                    if (startDate) {
                        conditions.push((0, drizzle_orm_1.gte)(shared_schema_1.buddySystemEvents.timestamp, startDate));
                    }
                    if (endDate) {
                        conditions.push((0, drizzle_orm_1.lte)(shared_schema_1.buddySystemEvents.timestamp, endDate));
                    }
                    return [4 /*yield*/, shared_schema_1.db
                            .select({
                            payload: shared_schema_1.buddySystemEvents.payload,
                        })
                            .from(shared_schema_1.buddySystemEvents)
                            .where(conditions.length > 0 ? drizzle_orm_1.and.apply(void 0, conditions) : undefined)];
                case 1:
                    events = _e.sent();
                    sdgCounts = new Map();
                    for (_i = 0, events_1 = events; _i < events_1.length; _i++) {
                        event_1 = events_1[_i];
                        sdgs = event_1.payload.sdgs || [];
                        for (_a = 0, sdgs_1 = sdgs; _a < sdgs_1.length; _a++) {
                            sdg = sdgs_1[_a];
                            sdgCounts.set(sdg, (sdgCounts.get(sdg) || 0) + 1);
                        }
                    }
                    distribution = [];
                    for (_b = 0, _c = sdgCounts.entries(); _b < _c.length; _b++) {
                        _d = _c[_b], sdg = _d[0], count = _d[1];
                        reference = sdg_mappings_json_1.default.sdgReference[sdg.toString()];
                        if (reference) {
                            distribution.push({
                                sdg: sdg,
                                name: reference.name,
                                description: reference.description,
                                event_count: count,
                            });
                        }
                    }
                    // Sort by SDG number
                    distribution.sort(function (a, b) { return a.sdg - b.sdg; });
                    logger.info({ sdgCount: distribution.length }, 'SDG distribution calculated');
                    return [2 /*return*/, distribution];
            }
        });
    });
}
/**
 * Query events by SDG number
 * Supports pagination and filtering
 */
function getEventsBySDG(filter) {
    return __awaiter(this, void 0, void 0, function () {
        var sdg, startDate, endDate, eventType, _a, limit, _b, offset, conditions, events;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    sdg = filter.sdg, startDate = filter.startDate, endDate = filter.endDate, eventType = filter.eventType, _a = filter.limit, limit = _a === void 0 ? 100 : _a, _b = filter.offset, offset = _b === void 0 ? 0 : _b;
                    logger.info(filter, 'Querying events by SDG');
                    if (!sdg) {
                        throw new Error('SDG number is required');
                    }
                    conditions = [];
                    // Filter by SDG using JSON containment operator
                    conditions.push((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", "->>'sdgs' @> ", ""], ["", "->>'sdgs' @> ", ""])), shared_schema_1.buddySystemEvents.payload, JSON.stringify([sdg])));
                    if (startDate) {
                        conditions.push((0, drizzle_orm_1.gte)(shared_schema_1.buddySystemEvents.timestamp, startDate));
                    }
                    if (endDate) {
                        conditions.push((0, drizzle_orm_1.lte)(shared_schema_1.buddySystemEvents.timestamp, endDate));
                    }
                    if (eventType) {
                        conditions.push((0, drizzle_orm_1.eq)(shared_schema_1.buddySystemEvents.eventType, eventType));
                    }
                    return [4 /*yield*/, shared_schema_1.db
                            .select()
                            .from(shared_schema_1.buddySystemEvents)
                            .where(drizzle_orm_1.and.apply(void 0, conditions))
                            .limit(limit)
                            .offset(offset)
                            .orderBy(shared_schema_1.buddySystemEvents.timestamp)];
                case 1:
                    events = _c.sent();
                    logger.info({ sdg: sdg, eventCount: events.length }, 'Events retrieved by SDG');
                    return [2 /*return*/, events];
            }
        });
    });
}
/**
 * Get SDG coverage report for a time period
 * Shows which SDGs are covered and event counts
 */
function getSDGCoverageReport(startDate, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var distribution, conditions, totalResult, totalEvents, sdgCoverage, coveredSDGs, _i, distribution_1, item, period, report;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info({ startDate: startDate, endDate: endDate }, 'Generating SDG coverage report');
                    return [4 /*yield*/, getSDGDistribution(startDate, endDate)];
                case 1:
                    distribution = _a.sent();
                    conditions = [];
                    if (startDate) {
                        conditions.push((0, drizzle_orm_1.gte)(shared_schema_1.buddySystemEvents.timestamp, startDate));
                    }
                    if (endDate) {
                        conditions.push((0, drizzle_orm_1.lte)(shared_schema_1.buddySystemEvents.timestamp, endDate));
                    }
                    return [4 /*yield*/, shared_schema_1.db
                            .select({ count: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["count(*)"], ["count(*)"]))) })
                            .from(shared_schema_1.buddySystemEvents)
                            .where(conditions.length > 0 ? drizzle_orm_1.and.apply(void 0, conditions) : undefined)];
                case 2:
                    totalResult = (_a.sent())[0];
                    totalEvents = Number((totalResult === null || totalResult === void 0 ? void 0 : totalResult.count) || 0);
                    sdgCoverage = {};
                    coveredSDGs = [];
                    for (_i = 0, distribution_1 = distribution; _i < distribution_1.length; _i++) {
                        item = distribution_1[_i];
                        sdgCoverage[item.sdg] = item;
                        coveredSDGs.push(item.sdg);
                    }
                    period = 'all-time';
                    if (startDate && endDate) {
                        period = "".concat(startDate.toISOString().split('T')[0], " to ").concat(endDate.toISOString().split('T')[0]);
                    }
                    else if (startDate) {
                        period = "since ".concat(startDate.toISOString().split('T')[0]);
                    }
                    else if (endDate) {
                        period = "until ".concat(endDate.toISOString().split('T')[0]);
                    }
                    report = {
                        period: period,
                        program: 'buddy',
                        total_events: totalEvents,
                        sdg_coverage: sdgCoverage,
                        covered_sdgs: coveredSDGs.sort(function (a, b) { return a - b; }),
                    };
                    logger.info({ period: period, totalEvents: totalEvents, coveredSDGs: coveredSDGs.length }, 'SDG coverage report generated');
                    return [2 /*return*/, report];
            }
        });
    });
}
/**
 * Get quarterly SDG report
 * Helper for generating Q1, Q2, Q3, Q4 reports
 */
function getQuarterlySDGReport(year, quarter) {
    return __awaiter(this, void 0, void 0, function () {
        var quarterStarts, quarterEnds, startDate, endDate, report;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quarterStarts = {
                        1: new Date(year, 0, 1),
                        2: new Date(year, 3, 1),
                        3: new Date(year, 6, 1),
                        4: new Date(year, 9, 1),
                    };
                    quarterEnds = {
                        1: new Date(year, 2, 31, 23, 59, 59),
                        2: new Date(year, 5, 30, 23, 59, 59),
                        3: new Date(year, 8, 30, 23, 59, 59),
                        4: new Date(year, 11, 31, 23, 59, 59),
                    };
                    startDate = quarterStarts[quarter];
                    endDate = quarterEnds[quarter];
                    logger.info({ year: year, quarter: quarter }, 'Generating quarterly SDG report');
                    return [4 /*yield*/, getSDGCoverageReport(startDate, endDate)];
                case 1:
                    report = _a.sent();
                    report.period = "".concat(year, "-Q").concat(quarter);
                    return [2 /*return*/, report];
            }
        });
    });
}
/**
 * Get SDG breakdown by event type
 * Shows which event types contribute to each SDG
 */
function getSDGBreakdownByEventType(sdg, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var conditions, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info({ sdg: sdg, startDate: startDate, endDate: endDate }, 'Generating SDG breakdown by event type');
                    conditions = [];
                    // Filter by SDG
                    conditions.push((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["", "->>'sdgs' @> ", ""], ["", "->>'sdgs' @> ", ""])), shared_schema_1.buddySystemEvents.payload, JSON.stringify([sdg])));
                    if (startDate) {
                        conditions.push((0, drizzle_orm_1.gte)(shared_schema_1.buddySystemEvents.timestamp, startDate));
                    }
                    if (endDate) {
                        conditions.push((0, drizzle_orm_1.lte)(shared_schema_1.buddySystemEvents.timestamp, endDate));
                    }
                    return [4 /*yield*/, shared_schema_1.db
                            .select({
                            eventType: shared_schema_1.buddySystemEvents.eventType,
                            count: (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["count(*)"], ["count(*)"]))),
                        })
                            .from(shared_schema_1.buddySystemEvents)
                            .where(drizzle_orm_1.and.apply(void 0, conditions))
                            .groupBy(shared_schema_1.buddySystemEvents.eventType)
                            .orderBy((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["count(*) DESC"], ["count(*) DESC"]))))];
                case 1:
                    results = _a.sent();
                    logger.info({ sdg: sdg, breakdown: results.length }, 'SDG breakdown by event type generated');
                    return [2 /*return*/, results.map(function (r) { return ({
                            event_type: r.eventType,
                            count: Number(r.count),
                        }); })];
            }
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5;
