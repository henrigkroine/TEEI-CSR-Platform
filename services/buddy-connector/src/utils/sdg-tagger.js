import { createServiceLogger } from '@teei/shared-utils';
import sdgMappings from '../config/sdg-mappings.json';
const logger = createServiceLogger('buddy-connector:sdg-tagger');
/**
 * Extract text fields from event payload for keyword matching
 */
function extractTextFields(payload) {
    const texts = [];
    // Common fields to check
    const fieldNames = ['title', 'eventTitle', 'category', 'description', 'skill_category', 'session_title'];
    for (const field of fieldNames) {
        if (payload.data?.[field]) {
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
    const normalizedKeyword = keyword.toLowerCase();
    return texts.some(text => text.includes(normalizedKeyword));
}
/**
 * Tag an event with relevant UN SDGs based on event type and content
 *
 * @param eventType - The event type (e.g., 'buddy.match.created')
 * @param payload - The full event payload
 * @returns SDGTaggingResult with SDG numbers, confidence scores, and detailed tags
 */
export function tagEventWithSDGs(eventType, payload) {
    const tags = [];
    const sdgMap = new Map();
    // Step 1: Primary mapping based on event type
    const eventTypeMapping = sdgMappings.eventTypeMappings[eventType];
    if (eventTypeMapping) {
        for (const sdg of eventTypeMapping.sdgs) {
            const tag = {
                sdg,
                confidence: eventTypeMapping.confidence,
                source: 'event_type',
            };
            tags.push(tag);
            sdgMap.set(sdg, tag);
        }
        logger.debug({ eventType, sdgs: eventTypeMapping.sdgs }, 'Applied event type SDG mapping');
    }
    else {
        logger.warn({ eventType }, 'No SDG mapping found for event type');
    }
    // Step 2: Secondary mapping based on keywords in content
    const textFields = extractTextFields(payload);
    if (textFields.length > 0) {
        for (const [keyword, mapping] of Object.entries(sdgMappings.keywordMappings)) {
            if (keywordMatches(keyword, textFields)) {
                for (const sdg of mapping.sdgs) {
                    const existingTag = sdgMap.get(sdg);
                    if (existingTag) {
                        // SDG already mapped from event type, keep higher confidence
                        if (mapping.confidence > existingTag.confidence) {
                            existingTag.confidence = mapping.confidence;
                            existingTag.matchedKeyword = keyword;
                        }
                    }
                    else {
                        // New SDG from keyword match
                        const tag = {
                            sdg,
                            confidence: mapping.confidence,
                            source: 'keyword',
                            matchedKeyword: keyword,
                        };
                        tags.push(tag);
                        sdgMap.set(sdg, tag);
                    }
                }
                logger.debug({ keyword, sdgs: mapping.sdgs, textFields }, 'Applied keyword SDG mapping');
            }
        }
    }
    // Step 3: Build final result
    const uniqueSdgs = Array.from(sdgMap.keys()).sort((a, b) => a - b);
    const sdgConfidence = {};
    for (const tag of tags) {
        const currentConfidence = sdgConfidence[tag.sdg.toString()];
        if (!currentConfidence || tag.confidence > currentConfidence) {
            sdgConfidence[tag.sdg.toString()] = tag.confidence;
        }
    }
    const result = {
        sdgs: uniqueSdgs,
        sdgConfidence,
        tags,
    };
    logger.info({ eventType, sdgs: uniqueSdgs, tagCount: tags.length }, 'Event tagged with SDGs');
    return result;
}
/**
 * Get SDG reference information
 */
export function getSDGReference(sdg) {
    return sdgMappings.sdgReference[sdg.toString()];
}
/**
 * Get all covered SDGs from the mapping configuration
 */
export function getAllCoveredSDGs() {
    const sdgs = new Set();
    for (const mapping of Object.values(sdgMappings.eventTypeMappings)) {
        mapping.sdgs.forEach(sdg => sdgs.add(sdg));
    }
    for (const mapping of Object.values(sdgMappings.keywordMappings)) {
        mapping.sdgs.forEach(sdg => sdgs.add(sdg));
    }
    return Array.from(sdgs).sort((a, b) => a - b);
}
/**
 * Validate that event payload will be enriched with SDG tags
 */
export function enrichPayloadWithSDGs(payload, sdgResult) {
    return {
        ...payload,
        sdgs: sdgResult.sdgs,
        sdg_confidence: sdgResult.sdgConfidence,
        sdg_tags: sdgResult.tags.map(tag => ({
            sdg: tag.sdg,
            confidence: tag.confidence,
            source: tag.source,
            matched_keyword: tag.matchedKeyword,
        })),
    };
}
//# sourceMappingURL=sdg-tagger.js.map