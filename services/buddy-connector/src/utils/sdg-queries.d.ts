export interface SDGDistribution {
    sdg: number;
    name: string;
    description: string;
    event_count: number;
}
export interface SDGCoverageReport {
    period: string;
    program: string;
    total_events: number;
    sdg_coverage: Record<number, SDGDistribution>;
    covered_sdgs: number[];
}
export interface SDGEventFilter {
    sdg?: number;
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    limit?: number;
    offset?: number;
}
/**
 * Get SDG distribution for a given time period
 * Returns count of events for each SDG goal
 */
export declare function getSDGDistribution(startDate?: Date, endDate?: Date): Promise<SDGDistribution[]>;
/**
 * Query events by SDG number
 * Supports pagination and filtering
 */
export declare function getEventsBySDG(filter: SDGEventFilter): Promise<any>;
/**
 * Get SDG coverage report for a time period
 * Shows which SDGs are covered and event counts
 */
export declare function getSDGCoverageReport(startDate?: Date, endDate?: Date): Promise<SDGCoverageReport>;
/**
 * Get quarterly SDG report
 * Helper for generating Q1, Q2, Q3, Q4 reports
 */
export declare function getQuarterlySDGReport(year: number, quarter: 1 | 2 | 3 | 4): Promise<SDGCoverageReport>;
/**
 * Get SDG breakdown by event type
 * Shows which event types contribute to each SDG
 */
export declare function getSDGBreakdownByEventType(sdg: number, startDate?: Date, endDate?: Date): Promise<any>;
//# sourceMappingURL=sdg-queries.d.ts.map