export interface SDGTag {
    sdg: number;
    confidence: number;
    source: 'event_type' | 'keyword';
    matchedKeyword?: string;
}
export interface SDGTaggingResult {
    sdgs: number[];
    sdgConfidence: Record<string, number>;
    tags: SDGTag[];
}
/**
 * Tag an event with relevant UN SDGs based on event type and content
 *
 * @param eventType - The event type (e.g., 'buddy.match.created')
 * @param payload - The full event payload
 * @returns SDGTaggingResult with SDG numbers, confidence scores, and detailed tags
 */
export declare function tagEventWithSDGs(eventType: string, payload: any): SDGTaggingResult;
/**
 * Get SDG reference information
 */
export declare function getSDGReference(sdg: number): {
    name: string;
    description: string;
    icon: string;
} | {
    name: string;
    description: string;
    icon: string;
} | {
    name: string;
    description: string;
    icon: string;
} | {
    name: string;
    description: string;
    icon: string;
} | {
    name: string;
    description: string;
    icon: string;
} | {
    name: string;
    description: string;
    icon: string;
} | {
    name: string;
    description: string;
    icon: string;
};
/**
 * Get all covered SDGs from the mapping configuration
 */
export declare function getAllCoveredSDGs(): number[];
/**
 * Validate that event payload will be enriched with SDG tags
 */
export declare function enrichPayloadWithSDGs(payload: any, sdgResult: SDGTaggingResult): any;
//# sourceMappingURL=sdg-tagger.d.ts.map