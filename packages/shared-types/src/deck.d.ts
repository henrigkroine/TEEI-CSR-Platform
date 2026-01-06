import { z } from 'zod';
/**
 * Deck & Executive Presentation Types
 * For Boardroom Mode v2 deck generator and PPTX export
 * Phase D Boardroom-ready presentation generation
 */
/**
 * Available deck templates
 */
export declare const DeckTemplateSchema: z.ZodEnum<["quarterly", "annual", "investor", "impact", "impact-deep-dive"]>;
export type DeckTemplate = z.infer<typeof DeckTemplateSchema>;
/**
 * Available slide block types
 */
export declare const SlideBlockTypeSchema: z.ZodEnum<["title", "content", "metrics-grid", "chart", "narrative", "table", "two-column", "image", "key-achievements", "evidence-summary"]>;
export type SlideBlockType = z.infer<typeof SlideBlockTypeSchema>;
/**
 * Citation info for a paragraph/section
 */
export declare const CitationInfoSchema: z.ZodObject<{
    paragraphIndex: z.ZodNumber;
    citationCount: z.ZodNumber;
    citationIds: z.ZodArray<z.ZodString, "many">;
    evidenceIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    citationCount: number;
    evidenceIds: string[];
    paragraphIndex: number;
    citationIds: string[];
}, {
    citationCount: number;
    evidenceIds: string[];
    paragraphIndex: number;
    citationIds: string[];
}>;
export type CitationInfo = z.infer<typeof CitationInfoSchema>;
/**
 * Slide block - a composable section within a slide
 */
export declare const SlideBlockSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["title", "content", "metrics-grid", "chart", "narrative", "table", "two-column", "image", "key-achievements", "evidence-summary"]>;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    bullets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    citationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    citations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        paragraphIndex: z.ZodNumber;
        citationCount: z.ZodNumber;
        citationIds: z.ZodArray<z.ZodString, "many">;
        evidenceIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        citationCount: number;
        evidenceIds: string[];
        paragraphIndex: number;
        citationIds: string[];
    }, {
        citationCount: number;
        evidenceIds: string[];
        paragraphIndex: number;
        citationIds: string[];
    }>, "many">>;
    chartConfig: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["bar", "line", "pie", "doughnut", "area"]>;
        labels: z.ZodArray<z.ZodString, "many">;
        datasets: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            data: z.ZodArray<z.ZodNumber, "many">;
            backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
            borderColor: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            data: number[];
            label: string;
            backgroundColor?: string | string[] | undefined;
            borderColor?: string | undefined;
        }, {
            data: number[];
            label: string;
            backgroundColor?: string | string[] | undefined;
            borderColor?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "bar" | "line" | "pie" | "doughnut" | "area";
        datasets: {
            data: number[];
            label: string;
            backgroundColor?: string | string[] | undefined;
            borderColor?: string | undefined;
        }[];
        labels: string[];
    }, {
        type: "bar" | "line" | "pie" | "doughnut" | "area";
        datasets: {
            data: number[];
            label: string;
            backgroundColor?: string | string[] | undefined;
            borderColor?: string | undefined;
        }[];
        labels: string[];
    }>>;
    tableConfig: z.ZodOptional<z.ZodObject<{
        headers: z.ZodArray<z.ZodString, "many">;
        rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
        columnWidths: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        headers: string[];
        rows: string[][];
        columnWidths?: number[] | undefined;
    }, {
        headers: string[];
        rows: string[][];
        columnWidths?: number[] | undefined;
    }>>;
    imageConfig: z.ZodOptional<z.ZodObject<{
        path: z.ZodString;
        alt: z.ZodString;
        caption: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        alt: string;
        caption?: string | undefined;
    }, {
        path: string;
        alt: string;
        caption?: string | undefined;
    }>>;
    metricsConfig: z.ZodOptional<z.ZodObject<{
        metrics: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
            change: z.ZodOptional<z.ZodNumber>;
            changeLabel: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            value: string | number;
            label: string;
            change?: number | undefined;
            changeLabel?: string | undefined;
        }, {
            value: string | number;
            label: string;
            change?: number | undefined;
            changeLabel?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        metrics: {
            value: string | number;
            label: string;
            change?: number | undefined;
            changeLabel?: string | undefined;
        }[];
    }, {
        metrics: {
            value: string | number;
            label: string;
            change?: number | undefined;
            changeLabel?: string | undefined;
        }[];
    }>>;
    explainer: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        content: string;
    }, {
        title: string;
        content: string;
    }>>;
    leftColumn: z.ZodOptional<z.ZodString>;
    rightColumn: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    speakerNotes: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
    id: string;
    citationIds: string[];
    order: number;
    metadata?: Record<string, any> | undefined;
    title?: string | undefined;
    content?: string | undefined;
    citations?: {
        citationCount: number;
        evidenceIds: string[];
        paragraphIndex: number;
        citationIds: string[];
    }[] | undefined;
    bullets?: string[] | undefined;
    chartConfig?: {
        type: "bar" | "line" | "pie" | "doughnut" | "area";
        datasets: {
            data: number[];
            label: string;
            backgroundColor?: string | string[] | undefined;
            borderColor?: string | undefined;
        }[];
        labels: string[];
    } | undefined;
    tableConfig?: {
        headers: string[];
        rows: string[][];
        columnWidths?: number[] | undefined;
    } | undefined;
    imageConfig?: {
        path: string;
        alt: string;
        caption?: string | undefined;
    } | undefined;
    metricsConfig?: {
        metrics: {
            value: string | number;
            label: string;
            change?: number | undefined;
            changeLabel?: string | undefined;
        }[];
    } | undefined;
    explainer?: {
        title: string;
        content: string;
    } | undefined;
    leftColumn?: string | undefined;
    rightColumn?: string | undefined;
    speakerNotes?: string | undefined;
}, {
    type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
    id: string;
    order: number;
    metadata?: Record<string, any> | undefined;
    title?: string | undefined;
    content?: string | undefined;
    citations?: {
        citationCount: number;
        evidenceIds: string[];
        paragraphIndex: number;
        citationIds: string[];
    }[] | undefined;
    citationIds?: string[] | undefined;
    bullets?: string[] | undefined;
    chartConfig?: {
        type: "bar" | "line" | "pie" | "doughnut" | "area";
        datasets: {
            data: number[];
            label: string;
            backgroundColor?: string | string[] | undefined;
            borderColor?: string | undefined;
        }[];
        labels: string[];
    } | undefined;
    tableConfig?: {
        headers: string[];
        rows: string[][];
        columnWidths?: number[] | undefined;
    } | undefined;
    imageConfig?: {
        path: string;
        alt: string;
        caption?: string | undefined;
    } | undefined;
    metricsConfig?: {
        metrics: {
            value: string | number;
            label: string;
            change?: number | undefined;
            changeLabel?: string | undefined;
        }[];
    } | undefined;
    explainer?: {
        title: string;
        content: string;
    } | undefined;
    leftColumn?: string | undefined;
    rightColumn?: string | undefined;
    speakerNotes?: string | undefined;
}>;
export type SlideBlock = z.infer<typeof SlideBlockSchema>;
/**
 * Slide definition
 */
export declare const SlideDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    slideNumber: z.ZodNumber;
    template: z.ZodString;
    blocks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["title", "content", "metrics-grid", "chart", "narrative", "table", "two-column", "image", "key-achievements", "evidence-summary"]>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        bullets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        citationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        citations: z.ZodOptional<z.ZodArray<z.ZodObject<{
            paragraphIndex: z.ZodNumber;
            citationCount: z.ZodNumber;
            citationIds: z.ZodArray<z.ZodString, "many">;
            evidenceIds: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }, {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }>, "many">>;
        chartConfig: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["bar", "line", "pie", "doughnut", "area"]>;
            labels: z.ZodArray<z.ZodString, "many">;
            datasets: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                data: z.ZodArray<z.ZodNumber, "many">;
                backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
                borderColor: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }, {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        }, {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        }>>;
        tableConfig: z.ZodOptional<z.ZodObject<{
            headers: z.ZodArray<z.ZodString, "many">;
            rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
            columnWidths: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        }, "strip", z.ZodTypeAny, {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        }, {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        }>>;
        imageConfig: z.ZodOptional<z.ZodObject<{
            path: z.ZodString;
            alt: z.ZodString;
            caption: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            alt: string;
            caption?: string | undefined;
        }, {
            path: string;
            alt: string;
            caption?: string | undefined;
        }>>;
        metricsConfig: z.ZodOptional<z.ZodObject<{
            metrics: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
                change: z.ZodOptional<z.ZodNumber>;
                changeLabel: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }, {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        }, {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        }>>;
        explainer: z.ZodOptional<z.ZodObject<{
            title: z.ZodString;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            title: string;
            content: string;
        }, {
            title: string;
            content: string;
        }>>;
        leftColumn: z.ZodOptional<z.ZodString>;
        rightColumn: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        speakerNotes: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        citationIds: string[];
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }, {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        citationIds?: string[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }>, "many">;
    notes: z.ZodOptional<z.ZodString>;
    evidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    slideNumber: number;
    template: string;
    blocks: {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        citationIds: string[];
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }[];
    evidenceIds?: string[] | undefined;
    notes?: string | undefined;
}, {
    id: string;
    slideNumber: number;
    template: string;
    blocks: {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        citationIds?: string[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }[];
    evidenceIds?: string[] | undefined;
    notes?: string | undefined;
}>;
export type SlideDefinition = z.infer<typeof SlideDefinitionSchema>;
/**
 * Theme configuration for deck branding (HEAD version)
 */
export declare const DeckThemeSchema: z.ZodObject<{
    primaryColor: z.ZodString;
    secondaryColor: z.ZodString;
    accentColor: z.ZodString;
    logoUrl: z.ZodOptional<z.ZodString>;
    fontFamily: z.ZodOptional<z.ZodString>;
    backgroundImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string | undefined;
    fontFamily?: string | undefined;
    backgroundImageUrl?: string | undefined;
}, {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string | undefined;
    fontFamily?: string | undefined;
    backgroundImageUrl?: string | undefined;
}>;
export type DeckTheme = z.infer<typeof DeckThemeSchema>;
/**
 * Theme configuration (incoming version - structured colors)
 */
export declare const ThemeConfigSchema: z.ZodObject<{
    name: z.ZodString;
    colors: z.ZodObject<{
        primary: z.ZodString;
        secondary: z.ZodString;
        accent: z.ZodString;
        textOnPrimary: z.ZodString;
        textOnSecondary: z.ZodString;
        textOnAccent: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        primary: string;
        secondary: string;
        accent: string;
        textOnPrimary: string;
        textOnSecondary: string;
        textOnAccent: string;
    }, {
        primary: string;
        secondary: string;
        accent: string;
        textOnPrimary: string;
        textOnSecondary: string;
        textOnAccent: string;
    }>;
    logo: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        position: z.ZodEnum<["top-left", "top-right", "bottom-left", "bottom-right"]>;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        url: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        width: number;
        height: number;
    }, {
        url: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        width: number;
        height: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        textOnPrimary: string;
        textOnSecondary: string;
        textOnAccent: string;
    };
    logo?: {
        url: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        width: number;
        height: number;
    } | undefined;
}, {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        textOnPrimary: string;
        textOnSecondary: string;
        textOnAccent: string;
    };
    logo?: {
        url: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        width: number;
        height: number;
    } | undefined;
}>;
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;
/**
 * Deck metadata tracking generation details
 */
export declare const DeckMetadataSchema: z.ZodObject<{
    createdAt: z.ZodString;
    createdBy: z.ZodString;
    updatedAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
    estimatedPages: z.ZodNumber;
    citationCount: z.ZodNumber;
    version: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["draft", "review", "approved", "archived"]>>;
    approvedAt: z.ZodOptional<z.ZodString>;
    approvedBy: z.ZodOptional<z.ZodString>;
    exportedAt: z.ZodOptional<z.ZodString>;
    exportFormat: z.ZodOptional<z.ZodEnum<["pptx", "pdf", "both"]>>;
    author: z.ZodOptional<z.ZodString>;
    approvalStatus: z.ZodOptional<z.ZodEnum<["draft", "pending", "approved", "rejected"]>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "review" | "approved" | "archived";
    createdAt: string;
    version: number;
    createdBy: string;
    citationCount: number;
    estimatedPages: number;
    updatedAt?: string | undefined;
    updatedBy?: string | undefined;
    approvedAt?: string | undefined;
    approvedBy?: string | undefined;
    exportedAt?: string | undefined;
    exportFormat?: "pptx" | "pdf" | "both" | undefined;
    author?: string | undefined;
    approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
}, {
    createdAt: string;
    createdBy: string;
    citationCount: number;
    estimatedPages: number;
    status?: "draft" | "review" | "approved" | "archived" | undefined;
    updatedAt?: string | undefined;
    version?: number | undefined;
    updatedBy?: string | undefined;
    approvedAt?: string | undefined;
    approvedBy?: string | undefined;
    exportedAt?: string | undefined;
    exportFormat?: "pptx" | "pdf" | "both" | undefined;
    author?: string | undefined;
    approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
}>;
export type DeckMetadata = z.infer<typeof DeckMetadataSchema>;
/**
 * Deck definition - the complete presentation (merged)
 */
export declare const DeckDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodString;
    template: z.ZodEnum<["quarterly", "annual", "investor", "impact", "impact-deep-dive"]>;
    periodStart: z.ZodOptional<z.ZodString>;
    periodEnd: z.ZodOptional<z.ZodString>;
    period: z.ZodOptional<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>>;
    locale: z.ZodDefault<z.ZodEnum<["en", "es", "fr", "uk", "no", "he", "ar"]>>;
    theme: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        primaryColor: z.ZodString;
        secondaryColor: z.ZodString;
        accentColor: z.ZodString;
        logoUrl: z.ZodOptional<z.ZodString>;
        fontFamily: z.ZodOptional<z.ZodString>;
        backgroundImageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    }, {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    }>, z.ZodObject<{
        name: z.ZodString;
        colors: z.ZodObject<{
            primary: z.ZodString;
            secondary: z.ZodString;
            accent: z.ZodString;
            textOnPrimary: z.ZodString;
            textOnSecondary: z.ZodString;
            textOnAccent: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        }, {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        }>;
        logo: z.ZodOptional<z.ZodObject<{
            url: z.ZodString;
            position: z.ZodEnum<["top-left", "top-right", "bottom-left", "bottom-right"]>;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        }, {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        };
        logo?: {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        } | undefined;
    }, {
        name: string;
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        };
        logo?: {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        } | undefined;
    }>]>>;
    slides: z.ZodUnion<[z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["title", "content", "metrics-grid", "chart", "narrative", "table", "two-column", "image", "key-achievements", "evidence-summary"]>;
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        bullets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        citationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        citations: z.ZodOptional<z.ZodArray<z.ZodObject<{
            paragraphIndex: z.ZodNumber;
            citationCount: z.ZodNumber;
            citationIds: z.ZodArray<z.ZodString, "many">;
            evidenceIds: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }, {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }>, "many">>;
        chartConfig: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["bar", "line", "pie", "doughnut", "area"]>;
            labels: z.ZodArray<z.ZodString, "many">;
            datasets: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                data: z.ZodArray<z.ZodNumber, "many">;
                backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
                borderColor: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }, {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        }, {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        }>>;
        tableConfig: z.ZodOptional<z.ZodObject<{
            headers: z.ZodArray<z.ZodString, "many">;
            rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
            columnWidths: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        }, "strip", z.ZodTypeAny, {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        }, {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        }>>;
        imageConfig: z.ZodOptional<z.ZodObject<{
            path: z.ZodString;
            alt: z.ZodString;
            caption: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            alt: string;
            caption?: string | undefined;
        }, {
            path: string;
            alt: string;
            caption?: string | undefined;
        }>>;
        metricsConfig: z.ZodOptional<z.ZodObject<{
            metrics: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
                change: z.ZodOptional<z.ZodNumber>;
                changeLabel: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }, {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        }, {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        }>>;
        explainer: z.ZodOptional<z.ZodObject<{
            title: z.ZodString;
            content: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            title: string;
            content: string;
        }, {
            title: string;
            content: string;
        }>>;
        leftColumn: z.ZodOptional<z.ZodString>;
        rightColumn: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        speakerNotes: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        citationIds: string[];
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }, {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        citationIds?: string[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }>, "many">, z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        slideNumber: z.ZodNumber;
        template: z.ZodString;
        blocks: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["title", "content", "metrics-grid", "chart", "narrative", "table", "two-column", "image", "key-achievements", "evidence-summary"]>;
            title: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            bullets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            citationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            citations: z.ZodOptional<z.ZodArray<z.ZodObject<{
                paragraphIndex: z.ZodNumber;
                citationCount: z.ZodNumber;
                citationIds: z.ZodArray<z.ZodString, "many">;
                evidenceIds: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }, {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }>, "many">>;
            chartConfig: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["bar", "line", "pie", "doughnut", "area"]>;
                labels: z.ZodArray<z.ZodString, "many">;
                datasets: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    data: z.ZodArray<z.ZodNumber, "many">;
                    backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
                    borderColor: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }, {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            }, {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            }>>;
            tableConfig: z.ZodOptional<z.ZodObject<{
                headers: z.ZodArray<z.ZodString, "many">;
                rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
                columnWidths: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            }, "strip", z.ZodTypeAny, {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            }, {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            }>>;
            imageConfig: z.ZodOptional<z.ZodObject<{
                path: z.ZodString;
                alt: z.ZodString;
                caption: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                alt: string;
                caption?: string | undefined;
            }, {
                path: string;
                alt: string;
                caption?: string | undefined;
            }>>;
            metricsConfig: z.ZodOptional<z.ZodObject<{
                metrics: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
                    change: z.ZodOptional<z.ZodNumber>;
                    changeLabel: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }, {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            }, {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            }>>;
            explainer: z.ZodOptional<z.ZodObject<{
                title: z.ZodString;
                content: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                content: string;
            }, {
                title: string;
                content: string;
            }>>;
            leftColumn: z.ZodOptional<z.ZodString>;
            rightColumn: z.ZodOptional<z.ZodString>;
            order: z.ZodNumber;
            speakerNotes: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            citationIds: string[];
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }, {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            citationIds?: string[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }>, "many">;
        notes: z.ZodOptional<z.ZodString>;
        evidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        slideNumber: number;
        template: string;
        blocks: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            citationIds: string[];
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[];
        evidenceIds?: string[] | undefined;
        notes?: string | undefined;
    }, {
        id: string;
        slideNumber: number;
        template: string;
        blocks: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            citationIds?: string[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[];
        evidenceIds?: string[] | undefined;
        notes?: string | undefined;
    }>, "many">]>;
    metadata: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        createdAt: z.ZodString;
        createdBy: z.ZodString;
        updatedAt: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
        estimatedPages: z.ZodNumber;
        citationCount: z.ZodNumber;
        version: z.ZodDefault<z.ZodNumber>;
        status: z.ZodDefault<z.ZodEnum<["draft", "review", "approved", "archived"]>>;
        approvedAt: z.ZodOptional<z.ZodString>;
        approvedBy: z.ZodOptional<z.ZodString>;
        exportedAt: z.ZodOptional<z.ZodString>;
        exportFormat: z.ZodOptional<z.ZodEnum<["pptx", "pdf", "both"]>>;
        author: z.ZodOptional<z.ZodString>;
        approvalStatus: z.ZodOptional<z.ZodEnum<["draft", "pending", "approved", "rejected"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "review" | "approved" | "archived";
        createdAt: string;
        version: number;
        createdBy: string;
        citationCount: number;
        estimatedPages: number;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
        approvedAt?: string | undefined;
        approvedBy?: string | undefined;
        exportedAt?: string | undefined;
        exportFormat?: "pptx" | "pdf" | "both" | undefined;
        author?: string | undefined;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    }, {
        createdAt: string;
        createdBy: string;
        citationCount: number;
        estimatedPages: number;
        status?: "draft" | "review" | "approved" | "archived" | undefined;
        updatedAt?: string | undefined;
        version?: number | undefined;
        updatedBy?: string | undefined;
        approvedAt?: string | undefined;
        approvedBy?: string | undefined;
        exportedAt?: string | undefined;
        exportFormat?: "pptx" | "pdf" | "both" | undefined;
        author?: string | undefined;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    }>, z.ZodObject<{
        author: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        version: z.ZodString;
        approvalStatus: z.ZodDefault<z.ZodEnum<["draft", "pending", "approved", "rejected"]>>;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        updatedAt: string;
        version: string;
        author: string;
        approvalStatus: "draft" | "approved" | "pending" | "rejected";
    }, {
        createdAt: string;
        updatedAt: string;
        version: string;
        author: string;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    }>]>>;
    coverSlide: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        date: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        logoUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        date?: string | undefined;
        logoUrl?: string | undefined;
        author?: string | undefined;
        subtitle?: string | undefined;
    }, {
        title: string;
        date?: string | undefined;
        logoUrl?: string | undefined;
        author?: string | undefined;
        subtitle?: string | undefined;
    }>>;
    footerText: z.ZodOptional<z.ZodString>;
    watermark: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        opacity: z.ZodDefault<z.ZodNumber>;
        position: z.ZodDefault<z.ZodEnum<["top-left", "top-right", "bottom-left", "bottom-right"]>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        opacity: number;
    }, {
        text: string;
        position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | undefined;
        opacity?: number | undefined;
    }>>;
    title: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    id: string;
    template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    locale: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar";
    slides: {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        citationIds: string[];
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }[] | {
        id: string;
        slideNumber: number;
        template: string;
        blocks: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            citationIds: string[];
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[];
        evidenceIds?: string[] | undefined;
        notes?: string | undefined;
    }[];
    metadata?: {
        status: "draft" | "review" | "approved" | "archived";
        createdAt: string;
        version: number;
        createdBy: string;
        citationCount: number;
        estimatedPages: number;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
        approvedAt?: string | undefined;
        approvedBy?: string | undefined;
        exportedAt?: string | undefined;
        exportFormat?: "pptx" | "pdf" | "both" | undefined;
        author?: string | undefined;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    } | {
        createdAt: string;
        updatedAt: string;
        version: string;
        author: string;
        approvalStatus: "draft" | "approved" | "pending" | "rejected";
    } | undefined;
    period?: {
        start: string;
        end: string;
    } | undefined;
    title?: string | undefined;
    watermark?: {
        text: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        opacity: number;
    } | undefined;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
    theme?: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    } | {
        name: string;
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        };
        logo?: {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        } | undefined;
    } | undefined;
    subtitle?: string | undefined;
    coverSlide?: {
        title: string;
        date?: string | undefined;
        logoUrl?: string | undefined;
        author?: string | undefined;
        subtitle?: string | undefined;
    } | undefined;
    footerText?: string | undefined;
}, {
    companyId: string;
    id: string;
    template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    slides: {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        citationIds?: string[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }[] | {
        id: string;
        slideNumber: number;
        template: string;
        blocks: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            citationIds?: string[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[];
        evidenceIds?: string[] | undefined;
        notes?: string | undefined;
    }[];
    metadata?: {
        createdAt: string;
        createdBy: string;
        citationCount: number;
        estimatedPages: number;
        status?: "draft" | "review" | "approved" | "archived" | undefined;
        updatedAt?: string | undefined;
        version?: number | undefined;
        updatedBy?: string | undefined;
        approvedAt?: string | undefined;
        approvedBy?: string | undefined;
        exportedAt?: string | undefined;
        exportFormat?: "pptx" | "pdf" | "both" | undefined;
        author?: string | undefined;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    } | {
        createdAt: string;
        updatedAt: string;
        version: string;
        author: string;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    } | undefined;
    period?: {
        start: string;
        end: string;
    } | undefined;
    title?: string | undefined;
    watermark?: {
        text: string;
        position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | undefined;
        opacity?: number | undefined;
    } | undefined;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
    locale?: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar" | undefined;
    theme?: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    } | {
        name: string;
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        };
        logo?: {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        } | undefined;
    } | undefined;
    subtitle?: string | undefined;
    coverSlide?: {
        title: string;
        date?: string | undefined;
        logoUrl?: string | undefined;
        author?: string | undefined;
        subtitle?: string | undefined;
    } | undefined;
    footerText?: string | undefined;
}>;
export type DeckDefinition = z.infer<typeof DeckDefinitionSchema>;
/**
 * Deck generation request (for creating new decks from data)
 */
export declare const GenerateDeckRequestSchema: z.ZodObject<{
    companyId: z.ZodString;
    template: z.ZodEnum<["quarterly", "annual", "investor", "impact", "impact-deep-dive"]>;
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    locale: z.ZodDefault<z.ZodEnum<["en", "es", "fr", "uk", "no"]>>;
    theme: z.ZodOptional<z.ZodObject<{
        primaryColor: z.ZodString;
        secondaryColor: z.ZodString;
        accentColor: z.ZodString;
        logoUrl: z.ZodOptional<z.ZodString>;
        fontFamily: z.ZodOptional<z.ZodString>;
        backgroundImageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    }, {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        includeCharts: z.ZodDefault<z.ZodBoolean>;
        includeEvidence: z.ZodDefault<z.ZodBoolean>;
        includeSpeakerNotes: z.ZodDefault<z.ZodBoolean>;
        maxSlides: z.ZodDefault<z.ZodNumber>;
        tone: z.ZodDefault<z.ZodEnum<["formal", "conversational", "technical"]>>;
    }, "strip", z.ZodTypeAny, {
        includeEvidence: boolean;
        includeCharts: boolean;
        includeSpeakerNotes: boolean;
        maxSlides: number;
        tone: "conversational" | "formal" | "technical";
    }, {
        includeEvidence?: boolean | undefined;
        includeCharts?: boolean | undefined;
        includeSpeakerNotes?: boolean | undefined;
        maxSlides?: number | undefined;
        tone?: "conversational" | "formal" | "technical" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    locale: "en" | "es" | "fr" | "uk" | "no";
    options?: {
        includeEvidence: boolean;
        includeCharts: boolean;
        includeSpeakerNotes: boolean;
        maxSlides: number;
        tone: "conversational" | "formal" | "technical";
    } | undefined;
    theme?: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    } | undefined;
}, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    options?: {
        includeEvidence?: boolean | undefined;
        includeCharts?: boolean | undefined;
        includeSpeakerNotes?: boolean | undefined;
        maxSlides?: number | undefined;
        tone?: "conversational" | "formal" | "technical" | undefined;
    } | undefined;
    locale?: "en" | "es" | "fr" | "uk" | "no" | undefined;
    theme?: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    } | undefined;
}>;
export type GenerateDeckRequest = z.infer<typeof GenerateDeckRequestSchema>;
/**
 * Deck generation response
 */
export declare const GenerateDeckResponseSchema: z.ZodObject<{
    deckId: z.ZodString;
    deck: z.ZodObject<{
        id: z.ZodString;
        companyId: z.ZodString;
        template: z.ZodEnum<["quarterly", "annual", "investor", "impact", "impact-deep-dive"]>;
        periodStart: z.ZodOptional<z.ZodString>;
        periodEnd: z.ZodOptional<z.ZodString>;
        period: z.ZodOptional<z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>>;
        locale: z.ZodDefault<z.ZodEnum<["en", "es", "fr", "uk", "no", "he", "ar"]>>;
        theme: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            primaryColor: z.ZodString;
            secondaryColor: z.ZodString;
            accentColor: z.ZodString;
            logoUrl: z.ZodOptional<z.ZodString>;
            fontFamily: z.ZodOptional<z.ZodString>;
            backgroundImageUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            primaryColor: string;
            secondaryColor: string;
            accentColor: string;
            logoUrl?: string | undefined;
            fontFamily?: string | undefined;
            backgroundImageUrl?: string | undefined;
        }, {
            primaryColor: string;
            secondaryColor: string;
            accentColor: string;
            logoUrl?: string | undefined;
            fontFamily?: string | undefined;
            backgroundImageUrl?: string | undefined;
        }>, z.ZodObject<{
            name: z.ZodString;
            colors: z.ZodObject<{
                primary: z.ZodString;
                secondary: z.ZodString;
                accent: z.ZodString;
                textOnPrimary: z.ZodString;
                textOnSecondary: z.ZodString;
                textOnAccent: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            }, {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            }>;
            logo: z.ZodOptional<z.ZodObject<{
                url: z.ZodString;
                position: z.ZodEnum<["top-left", "top-right", "bottom-left", "bottom-right"]>;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            }, {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            colors: {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            };
            logo?: {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            } | undefined;
        }, {
            name: string;
            colors: {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            };
            logo?: {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            } | undefined;
        }>]>>;
        slides: z.ZodUnion<[z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["title", "content", "metrics-grid", "chart", "narrative", "table", "two-column", "image", "key-achievements", "evidence-summary"]>;
            title: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            bullets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            citationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            citations: z.ZodOptional<z.ZodArray<z.ZodObject<{
                paragraphIndex: z.ZodNumber;
                citationCount: z.ZodNumber;
                citationIds: z.ZodArray<z.ZodString, "many">;
                evidenceIds: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }, {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }>, "many">>;
            chartConfig: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<["bar", "line", "pie", "doughnut", "area"]>;
                labels: z.ZodArray<z.ZodString, "many">;
                datasets: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    data: z.ZodArray<z.ZodNumber, "many">;
                    backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
                    borderColor: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }, {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            }, {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            }>>;
            tableConfig: z.ZodOptional<z.ZodObject<{
                headers: z.ZodArray<z.ZodString, "many">;
                rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
                columnWidths: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            }, "strip", z.ZodTypeAny, {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            }, {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            }>>;
            imageConfig: z.ZodOptional<z.ZodObject<{
                path: z.ZodString;
                alt: z.ZodString;
                caption: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                alt: string;
                caption?: string | undefined;
            }, {
                path: string;
                alt: string;
                caption?: string | undefined;
            }>>;
            metricsConfig: z.ZodOptional<z.ZodObject<{
                metrics: z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
                    change: z.ZodOptional<z.ZodNumber>;
                    changeLabel: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }, {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            }, {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            }>>;
            explainer: z.ZodOptional<z.ZodObject<{
                title: z.ZodString;
                content: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                content: string;
            }, {
                title: string;
                content: string;
            }>>;
            leftColumn: z.ZodOptional<z.ZodString>;
            rightColumn: z.ZodOptional<z.ZodString>;
            order: z.ZodNumber;
            speakerNotes: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            citationIds: string[];
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }, {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            citationIds?: string[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }>, "many">, z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            slideNumber: z.ZodNumber;
            template: z.ZodString;
            blocks: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodEnum<["title", "content", "metrics-grid", "chart", "narrative", "table", "two-column", "image", "key-achievements", "evidence-summary"]>;
                title: z.ZodOptional<z.ZodString>;
                content: z.ZodOptional<z.ZodString>;
                bullets: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                citationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                citations: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    paragraphIndex: z.ZodNumber;
                    citationCount: z.ZodNumber;
                    citationIds: z.ZodArray<z.ZodString, "many">;
                    evidenceIds: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }, {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }>, "many">>;
                chartConfig: z.ZodOptional<z.ZodObject<{
                    type: z.ZodEnum<["bar", "line", "pie", "doughnut", "area"]>;
                    labels: z.ZodArray<z.ZodString, "many">;
                    datasets: z.ZodArray<z.ZodObject<{
                        label: z.ZodString;
                        data: z.ZodArray<z.ZodNumber, "many">;
                        backgroundColor: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
                        borderColor: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }, {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }>, "many">;
                }, "strip", z.ZodTypeAny, {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                }, {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                }>>;
                tableConfig: z.ZodOptional<z.ZodObject<{
                    headers: z.ZodArray<z.ZodString, "many">;
                    rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
                    columnWidths: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
                }, "strip", z.ZodTypeAny, {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                }, {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                }>>;
                imageConfig: z.ZodOptional<z.ZodObject<{
                    path: z.ZodString;
                    alt: z.ZodString;
                    caption: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                }, {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                }>>;
                metricsConfig: z.ZodOptional<z.ZodObject<{
                    metrics: z.ZodArray<z.ZodObject<{
                        label: z.ZodString;
                        value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
                        change: z.ZodOptional<z.ZodNumber>;
                        changeLabel: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }, {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }>, "many">;
                }, "strip", z.ZodTypeAny, {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                }, {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                }>>;
                explainer: z.ZodOptional<z.ZodObject<{
                    title: z.ZodString;
                    content: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    title: string;
                    content: string;
                }, {
                    title: string;
                    content: string;
                }>>;
                leftColumn: z.ZodOptional<z.ZodString>;
                rightColumn: z.ZodOptional<z.ZodString>;
                order: z.ZodNumber;
                speakerNotes: z.ZodOptional<z.ZodString>;
                metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                citationIds: string[];
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }, {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                citationIds?: string[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }>, "many">;
            notes: z.ZodOptional<z.ZodString>;
            evidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            slideNumber: number;
            template: string;
            blocks: {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                citationIds: string[];
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }[];
            evidenceIds?: string[] | undefined;
            notes?: string | undefined;
        }, {
            id: string;
            slideNumber: number;
            template: string;
            blocks: {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                citationIds?: string[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }[];
            evidenceIds?: string[] | undefined;
            notes?: string | undefined;
        }>, "many">]>;
        metadata: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            createdAt: z.ZodString;
            createdBy: z.ZodString;
            updatedAt: z.ZodOptional<z.ZodString>;
            updatedBy: z.ZodOptional<z.ZodString>;
            estimatedPages: z.ZodNumber;
            citationCount: z.ZodNumber;
            version: z.ZodDefault<z.ZodNumber>;
            status: z.ZodDefault<z.ZodEnum<["draft", "review", "approved", "archived"]>>;
            approvedAt: z.ZodOptional<z.ZodString>;
            approvedBy: z.ZodOptional<z.ZodString>;
            exportedAt: z.ZodOptional<z.ZodString>;
            exportFormat: z.ZodOptional<z.ZodEnum<["pptx", "pdf", "both"]>>;
            author: z.ZodOptional<z.ZodString>;
            approvalStatus: z.ZodOptional<z.ZodEnum<["draft", "pending", "approved", "rejected"]>>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "review" | "approved" | "archived";
            createdAt: string;
            version: number;
            createdBy: string;
            citationCount: number;
            estimatedPages: number;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
            approvedAt?: string | undefined;
            approvedBy?: string | undefined;
            exportedAt?: string | undefined;
            exportFormat?: "pptx" | "pdf" | "both" | undefined;
            author?: string | undefined;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        }, {
            createdAt: string;
            createdBy: string;
            citationCount: number;
            estimatedPages: number;
            status?: "draft" | "review" | "approved" | "archived" | undefined;
            updatedAt?: string | undefined;
            version?: number | undefined;
            updatedBy?: string | undefined;
            approvedAt?: string | undefined;
            approvedBy?: string | undefined;
            exportedAt?: string | undefined;
            exportFormat?: "pptx" | "pdf" | "both" | undefined;
            author?: string | undefined;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        }>, z.ZodObject<{
            author: z.ZodString;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            version: z.ZodString;
            approvalStatus: z.ZodDefault<z.ZodEnum<["draft", "pending", "approved", "rejected"]>>;
        }, "strip", z.ZodTypeAny, {
            createdAt: string;
            updatedAt: string;
            version: string;
            author: string;
            approvalStatus: "draft" | "approved" | "pending" | "rejected";
        }, {
            createdAt: string;
            updatedAt: string;
            version: string;
            author: string;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        }>]>>;
        coverSlide: z.ZodOptional<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            date: z.ZodOptional<z.ZodString>;
            author: z.ZodOptional<z.ZodString>;
            logoUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            date?: string | undefined;
            logoUrl?: string | undefined;
            author?: string | undefined;
            subtitle?: string | undefined;
        }, {
            title: string;
            date?: string | undefined;
            logoUrl?: string | undefined;
            author?: string | undefined;
            subtitle?: string | undefined;
        }>>;
        footerText: z.ZodOptional<z.ZodString>;
        watermark: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            opacity: z.ZodDefault<z.ZodNumber>;
            position: z.ZodDefault<z.ZodEnum<["top-left", "top-right", "bottom-left", "bottom-right"]>>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            opacity: number;
        }, {
            text: string;
            position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | undefined;
            opacity?: number | undefined;
        }>>;
        title: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        id: string;
        template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
        locale: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar";
        slides: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            citationIds: string[];
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[] | {
            id: string;
            slideNumber: number;
            template: string;
            blocks: {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                citationIds: string[];
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }[];
            evidenceIds?: string[] | undefined;
            notes?: string | undefined;
        }[];
        metadata?: {
            status: "draft" | "review" | "approved" | "archived";
            createdAt: string;
            version: number;
            createdBy: string;
            citationCount: number;
            estimatedPages: number;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
            approvedAt?: string | undefined;
            approvedBy?: string | undefined;
            exportedAt?: string | undefined;
            exportFormat?: "pptx" | "pdf" | "both" | undefined;
            author?: string | undefined;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        } | {
            createdAt: string;
            updatedAt: string;
            version: string;
            author: string;
            approvalStatus: "draft" | "approved" | "pending" | "rejected";
        } | undefined;
        period?: {
            start: string;
            end: string;
        } | undefined;
        title?: string | undefined;
        watermark?: {
            text: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            opacity: number;
        } | undefined;
        periodStart?: string | undefined;
        periodEnd?: string | undefined;
        theme?: {
            primaryColor: string;
            secondaryColor: string;
            accentColor: string;
            logoUrl?: string | undefined;
            fontFamily?: string | undefined;
            backgroundImageUrl?: string | undefined;
        } | {
            name: string;
            colors: {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            };
            logo?: {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        subtitle?: string | undefined;
        coverSlide?: {
            title: string;
            date?: string | undefined;
            logoUrl?: string | undefined;
            author?: string | undefined;
            subtitle?: string | undefined;
        } | undefined;
        footerText?: string | undefined;
    }, {
        companyId: string;
        id: string;
        template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
        slides: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            citationIds?: string[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[] | {
            id: string;
            slideNumber: number;
            template: string;
            blocks: {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                citationIds?: string[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }[];
            evidenceIds?: string[] | undefined;
            notes?: string | undefined;
        }[];
        metadata?: {
            createdAt: string;
            createdBy: string;
            citationCount: number;
            estimatedPages: number;
            status?: "draft" | "review" | "approved" | "archived" | undefined;
            updatedAt?: string | undefined;
            version?: number | undefined;
            updatedBy?: string | undefined;
            approvedAt?: string | undefined;
            approvedBy?: string | undefined;
            exportedAt?: string | undefined;
            exportFormat?: "pptx" | "pdf" | "both" | undefined;
            author?: string | undefined;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        } | {
            createdAt: string;
            updatedAt: string;
            version: string;
            author: string;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        } | undefined;
        period?: {
            start: string;
            end: string;
        } | undefined;
        title?: string | undefined;
        watermark?: {
            text: string;
            position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | undefined;
            opacity?: number | undefined;
        } | undefined;
        periodStart?: string | undefined;
        periodEnd?: string | undefined;
        locale?: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar" | undefined;
        theme?: {
            primaryColor: string;
            secondaryColor: string;
            accentColor: string;
            logoUrl?: string | undefined;
            fontFamily?: string | undefined;
            backgroundImageUrl?: string | undefined;
        } | {
            name: string;
            colors: {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            };
            logo?: {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        subtitle?: string | undefined;
        coverSlide?: {
            title: string;
            date?: string | undefined;
            logoUrl?: string | undefined;
            author?: string | undefined;
            subtitle?: string | undefined;
        } | undefined;
        footerText?: string | undefined;
    }>;
    generatedAt: z.ZodString;
    estimatedExportTime: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    generatedAt: string;
    deckId: string;
    deck: {
        companyId: string;
        id: string;
        template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
        locale: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar";
        slides: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            citationIds: string[];
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[] | {
            id: string;
            slideNumber: number;
            template: string;
            blocks: {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                citationIds: string[];
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }[];
            evidenceIds?: string[] | undefined;
            notes?: string | undefined;
        }[];
        metadata?: {
            status: "draft" | "review" | "approved" | "archived";
            createdAt: string;
            version: number;
            createdBy: string;
            citationCount: number;
            estimatedPages: number;
            updatedAt?: string | undefined;
            updatedBy?: string | undefined;
            approvedAt?: string | undefined;
            approvedBy?: string | undefined;
            exportedAt?: string | undefined;
            exportFormat?: "pptx" | "pdf" | "both" | undefined;
            author?: string | undefined;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        } | {
            createdAt: string;
            updatedAt: string;
            version: string;
            author: string;
            approvalStatus: "draft" | "approved" | "pending" | "rejected";
        } | undefined;
        period?: {
            start: string;
            end: string;
        } | undefined;
        title?: string | undefined;
        watermark?: {
            text: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            opacity: number;
        } | undefined;
        periodStart?: string | undefined;
        periodEnd?: string | undefined;
        theme?: {
            primaryColor: string;
            secondaryColor: string;
            accentColor: string;
            logoUrl?: string | undefined;
            fontFamily?: string | undefined;
            backgroundImageUrl?: string | undefined;
        } | {
            name: string;
            colors: {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            };
            logo?: {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        subtitle?: string | undefined;
        coverSlide?: {
            title: string;
            date?: string | undefined;
            logoUrl?: string | undefined;
            author?: string | undefined;
            subtitle?: string | undefined;
        } | undefined;
        footerText?: string | undefined;
    };
    estimatedExportTime?: number | undefined;
}, {
    generatedAt: string;
    deckId: string;
    deck: {
        companyId: string;
        id: string;
        template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
        slides: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            citationIds?: string[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[] | {
            id: string;
            slideNumber: number;
            template: string;
            blocks: {
                type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
                id: string;
                order: number;
                metadata?: Record<string, any> | undefined;
                title?: string | undefined;
                content?: string | undefined;
                citations?: {
                    citationCount: number;
                    evidenceIds: string[];
                    paragraphIndex: number;
                    citationIds: string[];
                }[] | undefined;
                citationIds?: string[] | undefined;
                bullets?: string[] | undefined;
                chartConfig?: {
                    type: "bar" | "line" | "pie" | "doughnut" | "area";
                    datasets: {
                        data: number[];
                        label: string;
                        backgroundColor?: string | string[] | undefined;
                        borderColor?: string | undefined;
                    }[];
                    labels: string[];
                } | undefined;
                tableConfig?: {
                    headers: string[];
                    rows: string[][];
                    columnWidths?: number[] | undefined;
                } | undefined;
                imageConfig?: {
                    path: string;
                    alt: string;
                    caption?: string | undefined;
                } | undefined;
                metricsConfig?: {
                    metrics: {
                        value: string | number;
                        label: string;
                        change?: number | undefined;
                        changeLabel?: string | undefined;
                    }[];
                } | undefined;
                explainer?: {
                    title: string;
                    content: string;
                } | undefined;
                leftColumn?: string | undefined;
                rightColumn?: string | undefined;
                speakerNotes?: string | undefined;
            }[];
            evidenceIds?: string[] | undefined;
            notes?: string | undefined;
        }[];
        metadata?: {
            createdAt: string;
            createdBy: string;
            citationCount: number;
            estimatedPages: number;
            status?: "draft" | "review" | "approved" | "archived" | undefined;
            updatedAt?: string | undefined;
            version?: number | undefined;
            updatedBy?: string | undefined;
            approvedAt?: string | undefined;
            approvedBy?: string | undefined;
            exportedAt?: string | undefined;
            exportFormat?: "pptx" | "pdf" | "both" | undefined;
            author?: string | undefined;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        } | {
            createdAt: string;
            updatedAt: string;
            version: string;
            author: string;
            approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
        } | undefined;
        period?: {
            start: string;
            end: string;
        } | undefined;
        title?: string | undefined;
        watermark?: {
            text: string;
            position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | undefined;
            opacity?: number | undefined;
        } | undefined;
        periodStart?: string | undefined;
        periodEnd?: string | undefined;
        locale?: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar" | undefined;
        theme?: {
            primaryColor: string;
            secondaryColor: string;
            accentColor: string;
            logoUrl?: string | undefined;
            fontFamily?: string | undefined;
            backgroundImageUrl?: string | undefined;
        } | {
            name: string;
            colors: {
                primary: string;
                secondary: string;
                accent: string;
                textOnPrimary: string;
                textOnSecondary: string;
                textOnAccent: string;
            };
            logo?: {
                url: string;
                position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        subtitle?: string | undefined;
        coverSlide?: {
            title: string;
            date?: string | undefined;
            logoUrl?: string | undefined;
            author?: string | undefined;
            subtitle?: string | undefined;
        } | undefined;
        footerText?: string | undefined;
    };
    estimatedExportTime?: number | undefined;
}>;
export type GenerateDeckResponse = z.infer<typeof GenerateDeckResponseSchema>;
/**
 * Deck export request (for converting existing deck to file format)
 * Note: This is the simpler synchronous export schema from HEAD
 */
export declare const ExportDeckRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    format: z.ZodEnum<["pptx", "pdf"]>;
    options: z.ZodOptional<z.ZodObject<{
        includeWatermark: z.ZodDefault<z.ZodBoolean>;
        includeEvidence: z.ZodDefault<z.ZodBoolean>;
        includeSpeakerNotes: z.ZodDefault<z.ZodBoolean>;
        quality: z.ZodDefault<z.ZodEnum<["standard", "high", "print"]>>;
    }, "strip", z.ZodTypeAny, {
        includeEvidence: boolean;
        includeSpeakerNotes: boolean;
        includeWatermark: boolean;
        quality: "high" | "standard" | "print";
    }, {
        includeEvidence?: boolean | undefined;
        includeSpeakerNotes?: boolean | undefined;
        includeWatermark?: boolean | undefined;
        quality?: "high" | "standard" | "print" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    deckId: string;
    format: "pptx" | "pdf";
    options?: {
        includeEvidence: boolean;
        includeSpeakerNotes: boolean;
        includeWatermark: boolean;
        quality: "high" | "standard" | "print";
    } | undefined;
}, {
    deckId: string;
    format: "pptx" | "pdf";
    options?: {
        includeEvidence?: boolean | undefined;
        includeSpeakerNotes?: boolean | undefined;
        includeWatermark?: boolean | undefined;
        quality?: "high" | "standard" | "print" | undefined;
    } | undefined;
}>;
export type ExportDeckRequest = z.infer<typeof ExportDeckRequestSchema>;
/**
 * Deck export response (synchronous version with immediate download)
 */
export declare const ExportDeckResponseSchema: z.ZodObject<{
    deckId: z.ZodString;
    format: z.ZodEnum<["pptx", "pdf"]>;
    downloadUrl: z.ZodString;
    fileSize: z.ZodNumber;
    expiresAt: z.ZodString;
    checksum: z.ZodString;
    metadata: z.ZodObject<{
        exportedAt: z.ZodString;
        exportedBy: z.ZodString;
        pageCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        exportedAt: string;
        exportedBy: string;
        pageCount: number;
    }, {
        exportedAt: string;
        exportedBy: string;
        pageCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        exportedAt: string;
        exportedBy: string;
        pageCount: number;
    };
    deckId: string;
    format: "pptx" | "pdf";
    downloadUrl: string;
    fileSize: number;
    expiresAt: string;
    checksum: string;
}, {
    metadata: {
        exportedAt: string;
        exportedBy: string;
        pageCount: number;
    };
    deckId: string;
    format: "pptx" | "pdf";
    downloadUrl: string;
    fileSize: number;
    expiresAt: string;
    checksum: string;
}>;
export type ExportDeckResponse = z.infer<typeof ExportDeckResponseSchema>;
/**
 * Deck export request (async version with progress tracking)
 * Supports both PDF and PPTX in single request
 */
export declare const DeckExportRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<["pptx", "pdf", "both"]>>;
    options: z.ZodOptional<z.ZodObject<{
        includeWatermark: z.ZodDefault<z.ZodBoolean>;
        watermarkText: z.ZodOptional<z.ZodString>;
        includeNotes: z.ZodDefault<z.ZodBoolean>;
        includeEvidence: z.ZodDefault<z.ZodBoolean>;
        compressImages: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeEvidence: boolean;
        includeWatermark: boolean;
        includeNotes: boolean;
        compressImages: boolean;
        watermarkText?: string | undefined;
    }, {
        includeEvidence?: boolean | undefined;
        includeWatermark?: boolean | undefined;
        watermarkText?: string | undefined;
        includeNotes?: boolean | undefined;
        compressImages?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    deckId: string;
    format: "pptx" | "pdf" | "both";
    options?: {
        includeEvidence: boolean;
        includeWatermark: boolean;
        includeNotes: boolean;
        compressImages: boolean;
        watermarkText?: string | undefined;
    } | undefined;
}, {
    deckId: string;
    options?: {
        includeEvidence?: boolean | undefined;
        includeWatermark?: boolean | undefined;
        watermarkText?: string | undefined;
        includeNotes?: boolean | undefined;
        compressImages?: boolean | undefined;
    } | undefined;
    format?: "pptx" | "pdf" | "both" | undefined;
}>;
export type DeckExportRequest = z.infer<typeof DeckExportRequestSchema>;
/**
 * Deck export response (async version with job tracking)
 */
export declare const DeckExportResponseSchema: z.ZodObject<{
    exportId: z.ZodString;
    status: z.ZodEnum<["queued", "generating", "completed", "failed"]>;
    progress: z.ZodNumber;
    message: z.ZodString;
    downloadUrl: z.ZodOptional<z.ZodString>;
    pdfUrl: z.ZodOptional<z.ZodString>;
    pptxUrl: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "generating" | "failed" | "queued";
    message: string;
    exportId: string;
    progress: number;
    error?: string | undefined;
    downloadUrl?: string | undefined;
    pdfUrl?: string | undefined;
    pptxUrl?: string | undefined;
    completedAt?: string | undefined;
}, {
    status: "completed" | "generating" | "failed" | "queued";
    message: string;
    exportId: string;
    progress: number;
    error?: string | undefined;
    downloadUrl?: string | undefined;
    pdfUrl?: string | undefined;
    pptxUrl?: string | undefined;
    completedAt?: string | undefined;
}>;
export type DeckExportResponse = z.infer<typeof DeckExportResponseSchema>;
/**
 * Deck template metadata
 */
export declare const DeckTemplateMetadataSchema: z.ZodObject<{
    id: z.ZodEnum<["quarterly", "annual", "investor", "impact", "impact-deep-dive"]>;
    name: z.ZodString;
    description: z.ZodString;
    defaultSlides: z.ZodArray<z.ZodString, "many">;
    supportedLocales: z.ZodArray<z.ZodString, "many">;
    previewImage: z.ZodOptional<z.ZodString>;
    estimatedSlides: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    name: string;
    description: string;
    defaultSlides: string[];
    supportedLocales: string[];
    estimatedSlides: number;
    previewImage?: string | undefined;
}, {
    id: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    name: string;
    description: string;
    defaultSlides: string[];
    supportedLocales: string[];
    estimatedSlides: number;
    previewImage?: string | undefined;
}>;
export type DeckTemplateMetadata = z.infer<typeof DeckTemplateMetadataSchema>;
/**
 * Live tile configuration for Boardroom Mode
 */
export declare const LiveTileConfigSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["metric", "chart", "narrative", "table"]>;
    title: z.ZodString;
    dataSource: z.ZodString;
    refreshInterval: z.ZodOptional<z.ZodNumber>;
    position: z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        row: number;
        col: number;
    }, {
        width: number;
        height: number;
        row: number;
        col: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "metric" | "narrative" | "chart" | "table";
    dataSource: string;
    id: string;
    title: string;
    position: {
        width: number;
        height: number;
        row: number;
        col: number;
    };
    refreshInterval?: number | undefined;
}, {
    type: "metric" | "narrative" | "chart" | "table";
    dataSource: string;
    id: string;
    title: string;
    position: {
        width: number;
        height: number;
        row: number;
        col: number;
    };
    refreshInterval?: number | undefined;
}>;
export type LiveTileConfig = z.infer<typeof LiveTileConfigSchema>;
/**
 * Boardroom v2 configuration
 */
export declare const BoardroomConfigSchema: z.ZodObject<{
    deckId: z.ZodOptional<z.ZodString>;
    tiles: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["metric", "chart", "narrative", "table"]>;
        title: z.ZodString;
        dataSource: z.ZodString;
        refreshInterval: z.ZodOptional<z.ZodNumber>;
        position: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
            row: number;
            col: number;
        }, {
            width: number;
            height: number;
            row: number;
            col: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "metric" | "narrative" | "chart" | "table";
        dataSource: string;
        id: string;
        title: string;
        position: {
            width: number;
            height: number;
            row: number;
            col: number;
        };
        refreshInterval?: number | undefined;
    }, {
        type: "metric" | "narrative" | "chart" | "table";
        dataSource: string;
        id: string;
        title: string;
        position: {
            width: number;
            height: number;
            row: number;
            col: number;
        };
        refreshInterval?: number | undefined;
    }>, "many">;
    layout: z.ZodDefault<z.ZodEnum<["grid", "slides", "hybrid"]>>;
    autoCycle: z.ZodDefault<z.ZodBoolean>;
    cycleInterval: z.ZodDefault<z.ZodNumber>;
    enableSSE: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tiles: {
        type: "metric" | "narrative" | "chart" | "table";
        dataSource: string;
        id: string;
        title: string;
        position: {
            width: number;
            height: number;
            row: number;
            col: number;
        };
        refreshInterval?: number | undefined;
    }[];
    layout: "hybrid" | "slides" | "grid";
    autoCycle: boolean;
    cycleInterval: number;
    enableSSE: boolean;
    deckId?: string | undefined;
}, {
    tiles: {
        type: "metric" | "narrative" | "chart" | "table";
        dataSource: string;
        id: string;
        title: string;
        position: {
            width: number;
            height: number;
            row: number;
            col: number;
        };
        refreshInterval?: number | undefined;
    }[];
    deckId?: string | undefined;
    layout?: "hybrid" | "slides" | "grid" | undefined;
    autoCycle?: boolean | undefined;
    cycleInterval?: number | undefined;
    enableSSE?: boolean | undefined;
}>;
export type BoardroomConfig = z.infer<typeof BoardroomConfigSchema>;
/**
 * Validation Helpers
 */
/**
 * Validates deck definition data
 * @throws {ZodError} If validation fails
 */
export declare function validateDeckDefinition(data: unknown): DeckDefinition;
/**
 * Safely validates deck definition without throwing
 */
export declare function safeParseDeckDefinition(data: unknown): z.SafeParseReturnType<{
    companyId: string;
    id: string;
    template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    slides: {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        citationIds?: string[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }[] | {
        id: string;
        slideNumber: number;
        template: string;
        blocks: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            citationIds?: string[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[];
        evidenceIds?: string[] | undefined;
        notes?: string | undefined;
    }[];
    metadata?: {
        createdAt: string;
        createdBy: string;
        citationCount: number;
        estimatedPages: number;
        status?: "draft" | "review" | "approved" | "archived" | undefined;
        updatedAt?: string | undefined;
        version?: number | undefined;
        updatedBy?: string | undefined;
        approvedAt?: string | undefined;
        approvedBy?: string | undefined;
        exportedAt?: string | undefined;
        exportFormat?: "pptx" | "pdf" | "both" | undefined;
        author?: string | undefined;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    } | {
        createdAt: string;
        updatedAt: string;
        version: string;
        author: string;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    } | undefined;
    period?: {
        start: string;
        end: string;
    } | undefined;
    title?: string | undefined;
    watermark?: {
        text: string;
        position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | undefined;
        opacity?: number | undefined;
    } | undefined;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
    locale?: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar" | undefined;
    theme?: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    } | {
        name: string;
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        };
        logo?: {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        } | undefined;
    } | undefined;
    subtitle?: string | undefined;
    coverSlide?: {
        title: string;
        date?: string | undefined;
        logoUrl?: string | undefined;
        author?: string | undefined;
        subtitle?: string | undefined;
    } | undefined;
    footerText?: string | undefined;
}, {
    companyId: string;
    id: string;
    template: "quarterly" | "annual" | "investor" | "impact" | "impact-deep-dive";
    locale: "en" | "es" | "fr" | "uk" | "no" | "he" | "ar";
    slides: {
        type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
        id: string;
        citationIds: string[];
        order: number;
        metadata?: Record<string, any> | undefined;
        title?: string | undefined;
        content?: string | undefined;
        citations?: {
            citationCount: number;
            evidenceIds: string[];
            paragraphIndex: number;
            citationIds: string[];
        }[] | undefined;
        bullets?: string[] | undefined;
        chartConfig?: {
            type: "bar" | "line" | "pie" | "doughnut" | "area";
            datasets: {
                data: number[];
                label: string;
                backgroundColor?: string | string[] | undefined;
                borderColor?: string | undefined;
            }[];
            labels: string[];
        } | undefined;
        tableConfig?: {
            headers: string[];
            rows: string[][];
            columnWidths?: number[] | undefined;
        } | undefined;
        imageConfig?: {
            path: string;
            alt: string;
            caption?: string | undefined;
        } | undefined;
        metricsConfig?: {
            metrics: {
                value: string | number;
                label: string;
                change?: number | undefined;
                changeLabel?: string | undefined;
            }[];
        } | undefined;
        explainer?: {
            title: string;
            content: string;
        } | undefined;
        leftColumn?: string | undefined;
        rightColumn?: string | undefined;
        speakerNotes?: string | undefined;
    }[] | {
        id: string;
        slideNumber: number;
        template: string;
        blocks: {
            type: "title" | "narrative" | "content" | "metrics-grid" | "chart" | "table" | "two-column" | "image" | "key-achievements" | "evidence-summary";
            id: string;
            citationIds: string[];
            order: number;
            metadata?: Record<string, any> | undefined;
            title?: string | undefined;
            content?: string | undefined;
            citations?: {
                citationCount: number;
                evidenceIds: string[];
                paragraphIndex: number;
                citationIds: string[];
            }[] | undefined;
            bullets?: string[] | undefined;
            chartConfig?: {
                type: "bar" | "line" | "pie" | "doughnut" | "area";
                datasets: {
                    data: number[];
                    label: string;
                    backgroundColor?: string | string[] | undefined;
                    borderColor?: string | undefined;
                }[];
                labels: string[];
            } | undefined;
            tableConfig?: {
                headers: string[];
                rows: string[][];
                columnWidths?: number[] | undefined;
            } | undefined;
            imageConfig?: {
                path: string;
                alt: string;
                caption?: string | undefined;
            } | undefined;
            metricsConfig?: {
                metrics: {
                    value: string | number;
                    label: string;
                    change?: number | undefined;
                    changeLabel?: string | undefined;
                }[];
            } | undefined;
            explainer?: {
                title: string;
                content: string;
            } | undefined;
            leftColumn?: string | undefined;
            rightColumn?: string | undefined;
            speakerNotes?: string | undefined;
        }[];
        evidenceIds?: string[] | undefined;
        notes?: string | undefined;
    }[];
    metadata?: {
        status: "draft" | "review" | "approved" | "archived";
        createdAt: string;
        version: number;
        createdBy: string;
        citationCount: number;
        estimatedPages: number;
        updatedAt?: string | undefined;
        updatedBy?: string | undefined;
        approvedAt?: string | undefined;
        approvedBy?: string | undefined;
        exportedAt?: string | undefined;
        exportFormat?: "pptx" | "pdf" | "both" | undefined;
        author?: string | undefined;
        approvalStatus?: "draft" | "approved" | "pending" | "rejected" | undefined;
    } | {
        createdAt: string;
        updatedAt: string;
        version: string;
        author: string;
        approvalStatus: "draft" | "approved" | "pending" | "rejected";
    } | undefined;
    period?: {
        start: string;
        end: string;
    } | undefined;
    title?: string | undefined;
    watermark?: {
        text: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        opacity: number;
    } | undefined;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
    theme?: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        logoUrl?: string | undefined;
        fontFamily?: string | undefined;
        backgroundImageUrl?: string | undefined;
    } | {
        name: string;
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            textOnPrimary: string;
            textOnSecondary: string;
            textOnAccent: string;
        };
        logo?: {
            url: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
            width: number;
            height: number;
        } | undefined;
    } | undefined;
    subtitle?: string | undefined;
    coverSlide?: {
        title: string;
        date?: string | undefined;
        logoUrl?: string | undefined;
        author?: string | undefined;
        subtitle?: string | undefined;
    } | undefined;
    footerText?: string | undefined;
}>;
/**
 * Validates if a string is a valid deck template
 */
export declare function isValidTemplate(template: string): boolean;
/**
 * Validates if a string is a valid slide block type
 */
export declare function isValidSlideBlockType(type: string): boolean;
/**
 * Validates slide block data
 * @throws {ZodError} If validation fails
 */
export declare function validateSlideBlock(data: unknown): SlideBlock;
/**
 * Validates deck theme configuration
 * @throws {ZodError} If validation fails
 */
export declare function validateDeckTheme(data: unknown): DeckTheme;
/**
 * Validates generation request
 * @throws {ZodError} If validation fails
 */
export declare function validateGenerateDeckRequest(data: unknown): GenerateDeckRequest;
/**
 * Validates export request
 * @throws {ZodError} If validation fails
 */
export declare function validateExportDeckRequest(data: unknown): ExportDeckRequest;
//# sourceMappingURL=deck.d.ts.map