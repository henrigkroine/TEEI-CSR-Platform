"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagEventWithSDGs = tagEventWithSDGs;
exports.getSDGReference = getSDGReference;
exports.getAllCoveredSDGs = getAllCoveredSDGs;
exports.enrichPayloadWithSDGs = enrichPayloadWithSDGs;
var shared_utils_1 = require("@teei/shared-utils");
var sdg_mappings_json_1 = require("../config/sdg-mappings.json");
var logger = (0, shared_utils_1.createServiceLogger)('buddy-connector:sdg-tagger');
/**
 * Extract text fields from event payload for keyword matching
 */
function extractTextFields(payload) {
    var _a;
    var texts = [];
    // Common fields to check
    var fieldNames = ['title', 'eventTitle', 'category', 'description', 'skill_category', 'session_title'];
    for (var _i = 0, fieldNames_1 = fieldNames; _i < fieldNames_1.length; _i++) {
        var field = fieldNames_1[_i];
        if ((_a = payload.data) === null || _a === void 0 ? void 0 : _a[field]) {
            texts.push(String(payload.data[field]).toLowerCase());
        }
        if (payload[field]) {
            texts.push(String(payload[field]).toLowerCase());
        }
    }
    return texts;
}
/**
 * Check if keyword appears in any of the text fields
 */
function keywordMatches(keyword, texts) {
    var normalizedKeyword = keyword.toLowerCase();
    return texts.some(function (text) { return text.includes(normalizedKeyword); });
}
/**
 * Tag an event with relevant UN SDGs based on event type and content
 *
 * @param eventType - The event type (e.g., 'buddy.match.created')
 * @param payload - The full event payload
 * @returns SDGTaggingResult with SDG numbers, confidence scores, and detailed tags
 */
function tagEventWithSDGs(eventType, payload) {
    var tags = [];
    var sdgMap = new Map();
    // Step 1: Primary mapping based on event type
    var eventTypeMapping = sdg_mappings_json_1.default.eventTypeMappings[eventType];
    if (eventTypeMapping) {
        for (var _i = 0, _a = eventTypeMapping.sdgs; _i < _a.length; _i++) {
            var sdg = _a[_i];
            var tag = {
                sdg: sdg,
                confidence: eventTypeMapping.confidence,
                source: 'event_type',
            };
            tags.push(tag);
            sdgMap.set(sdg, tag);
        }
        logger.debug({ eventType: eventType, sdgs: eventTypeMapping.sdgs }, 'Applied event type SDG mapping');
    }
    else {
        logger.warn({ eventType: eventType }, 'No SDG mapping found for event type');
    }
    // Step 2: Secondary mapping based on keywords in content
    var textFields = extractTextFields(payload);
    if (textFields.length > 0) {
        for (var _b = 0, _c = Object.entries(sdg_mappings_json_1.default.keywordMappings); _b < _c.length; _b++) {
            var _d = _c[_b], keyword = _d[0], mapping = _d[1];
            if (keywordMatches(keyword, textFields)) {
                for (var _e = 0, _f = mapping.sdgs; _e < _f.length; _e++) {
                    var sdg = _f[_e];
                    var existingTag = sdgMap.get(sdg);
                    if (existingTag) {
                        // SDG already mapped from event type, keep higher confidence
                        if (mapping.confidence > existingTag.confidence) {
                            existingTag.confidence = mapping.confidence;
                            existingTag.matchedKeyword = keyword;
                        }
                    }
                    else {
                        // New SDG from keyword match
                        var tag = {
                            sdg: sdg,
                            confidence: mapping.confidence,
                            source: 'keyword',
                            matchedKeyword: keyword,
                        };
                        tags.push(tag);
                        sdgMap.set(sdg, tag);
                    }
                }
                logger.debug({ keyword: keyword, sdgs: mapping.sdgs, textFields: textFields }, 'Applied keyword SDG mapping');
            }
        }
    }
    // Step 3: Build final result
    var uniqueSdgs = Array.from(sdgMap.keys()).sort(function (a, b) { return a - b; });
    var sdgConfidence = {};
    for (var _g = 0, tags_1 = tags; _g < tags_1.length; _g++) {
        var tag = tags_1[_g];
        var currentConfidence = sdgConfidence[tag.sdg.toString()];
        if (!currentConfidence || tag.confidence > currentConfidence) {
            sdgConfidence[tag.sdg.toString()] = tag.confidence;
        }
    }
    var result = {
        sdgs: uniqueSdgs,
        sdgConfidence: sdgConfidence,
        tags: tags,
    };
    logger.info({ eventType: eventType, sdgs: uniqueSdgs, tagCount: tags.length }, 'Event tagged with SDGs');
    return result;
}
/**
 * Get SDG reference information
 */
function getSDGReference(sdg) {
    return sdg_mappings_json_1.default.sdgReference[sdg.toString()];
}
/**
 * Get all covered SDGs from the mapping configuration
 */
function getAllCoveredSDGs() {
    var sdgs = new Set();
    for (var _i = 0, _a = Object.values(sdg_mappings_json_1.default.eventTypeMappings); _i < _a.length; _i++) {
        var mapping = _a[_i];
        mapping.sdgs.forEach(function (sdg) { return sdgs.add(sdg); });
    }
    for (var _b = 0, _c = Object.values(sdg_mappings_json_1.default.keywordMappings); _b < _c.length; _b++) {
        var mapping = _c[_b];
        mapping.sdgs.forEach(function (sdg) { return sdgs.add(sdg); });
    }
    return Array.from(sdgs).sort(function (a, b) { return a - b; });
}
/**
 * Validate that event payload will be enriched with SDG tags
 */
function enrichPayloadWithSDGs(payload, sdgResult) {
    return __assign(__assign({}, payload), { sdgs: sdgResult.sdgs, sdg_confidence: sdgResult.sdgConfidence, sdg_tags: sdgResult.tags.map(function (tag) { return ({
            sdg: tag.sdg,
            confidence: tag.confidence,
            source: tag.source,
            matched_keyword: tag.matchedKeyword,
        }); }) });
}
