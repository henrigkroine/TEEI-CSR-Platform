import { z } from 'zod';
/**
 * Impact Tiles Types
 * For Worker 3: Corporate Cockpit & Metrics Team
 * Pre-wired tiles for TEEI programs: Language, Mentorship, Upskilling, WEEI
 */
export declare const TileMetadataSchema: z.ZodObject<{
    tileId: z.ZodString;
    companyId: z.ZodString;
    programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
    calculatedAt: z.ZodString;
    dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    programType: "language" | "mentorship" | "upskilling" | "weei";
    tileId: string;
    calculatedAt: string;
    dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
}, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    programType: "language" | "mentorship" | "upskilling" | "weei";
    tileId: string;
    calculatedAt: string;
    dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
}>;
export type TileMetadata = z.infer<typeof TileMetadataSchema>;
export declare const LanguageTileDataSchema: z.ZodObject<{
    sessionsPerWeek: z.ZodNumber;
    targetSessionsPerWeek: z.ZodDefault<z.ZodNumber>;
    cohortDurationWeeks: z.ZodNumber;
    targetDurationWeeks: z.ZodDefault<z.ZodNumber>;
    volunteerHours: z.ZodObject<{
        total: z.ZodNumber;
        perSession: z.ZodNumber;
        uniqueVolunteers: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        total: number;
        perSession: number;
        uniqueVolunteers: number;
    }, {
        total: number;
        perSession: number;
        uniqueVolunteers: number;
    }>;
    retention: z.ZodObject<{
        enrollments: z.ZodNumber;
        activeParticipants: z.ZodNumber;
        completions: z.ZodNumber;
        dropoutRate: z.ZodNumber;
        retentionRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        enrollments: number;
        activeParticipants: number;
        completions: number;
        dropoutRate: number;
        retentionRate: number;
    }, {
        enrollments: number;
        activeParticipants: number;
        completions: number;
        dropoutRate: number;
        retentionRate: number;
    }>;
    languageLevels: z.ZodOptional<z.ZodObject<{
        averageStartLevel: z.ZodOptional<z.ZodString>;
        averageCurrentLevel: z.ZodOptional<z.ZodString>;
        progressionRate: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        averageStartLevel?: string | undefined;
        averageCurrentLevel?: string | undefined;
        progressionRate?: number | undefined;
    }, {
        averageStartLevel?: string | undefined;
        averageCurrentLevel?: string | undefined;
        progressionRate?: number | undefined;
    }>>;
    vis: z.ZodOptional<z.ZodNumber>;
    sroi: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sessionsPerWeek: number;
    targetSessionsPerWeek: number;
    cohortDurationWeeks: number;
    targetDurationWeeks: number;
    volunteerHours: {
        total: number;
        perSession: number;
        uniqueVolunteers: number;
    };
    retention: {
        enrollments: number;
        activeParticipants: number;
        completions: number;
        dropoutRate: number;
        retentionRate: number;
    };
    languageLevels?: {
        averageStartLevel?: string | undefined;
        averageCurrentLevel?: string | undefined;
        progressionRate?: number | undefined;
    } | undefined;
    vis?: number | undefined;
    sroi?: number | undefined;
}, {
    sessionsPerWeek: number;
    cohortDurationWeeks: number;
    volunteerHours: {
        total: number;
        perSession: number;
        uniqueVolunteers: number;
    };
    retention: {
        enrollments: number;
        activeParticipants: number;
        completions: number;
        dropoutRate: number;
        retentionRate: number;
    };
    targetSessionsPerWeek?: number | undefined;
    targetDurationWeeks?: number | undefined;
    languageLevels?: {
        averageStartLevel?: string | undefined;
        averageCurrentLevel?: string | undefined;
        progressionRate?: number | undefined;
    } | undefined;
    vis?: number | undefined;
    sroi?: number | undefined;
}>;
export type LanguageTileData = z.infer<typeof LanguageTileDataSchema>;
export declare const LanguageTileSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        sessionsPerWeek: z.ZodNumber;
        targetSessionsPerWeek: z.ZodDefault<z.ZodNumber>;
        cohortDurationWeeks: z.ZodNumber;
        targetDurationWeeks: z.ZodDefault<z.ZodNumber>;
        volunteerHours: z.ZodObject<{
            total: z.ZodNumber;
            perSession: z.ZodNumber;
            uniqueVolunteers: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        }, {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        }>;
        retention: z.ZodObject<{
            enrollments: z.ZodNumber;
            activeParticipants: z.ZodNumber;
            completions: z.ZodNumber;
            dropoutRate: z.ZodNumber;
            retentionRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        }, {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        }>;
        languageLevels: z.ZodOptional<z.ZodObject<{
            averageStartLevel: z.ZodOptional<z.ZodString>;
            averageCurrentLevel: z.ZodOptional<z.ZodString>;
            progressionRate: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        }, {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sessionsPerWeek: number;
        targetSessionsPerWeek: number;
        cohortDurationWeeks: number;
        targetDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    }, {
        sessionsPerWeek: number;
        cohortDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        targetSessionsPerWeek?: number | undefined;
        targetDurationWeeks?: number | undefined;
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        sessionsPerWeek: number;
        targetSessionsPerWeek: number;
        cohortDurationWeeks: number;
        targetDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        sessionsPerWeek: number;
        cohortDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        targetSessionsPerWeek?: number | undefined;
        targetDurationWeeks?: number | undefined;
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    };
}>;
export type LanguageTile = z.infer<typeof LanguageTileSchema>;
export declare const MentorshipTileDataSchema: z.ZodObject<{
    bookings: z.ZodObject<{
        total: z.ZodNumber;
        scheduled: z.ZodNumber;
        completed: z.ZodNumber;
        cancelled: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        completed: number;
        total: number;
        scheduled: number;
        cancelled: number;
    }, {
        completed: number;
        total: number;
        scheduled: number;
        cancelled: number;
    }>;
    attendance: z.ZodObject<{
        attendanceRate: z.ZodNumber;
        avgSessionDuration: z.ZodNumber;
        totalSessions: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        attendanceRate: number;
        avgSessionDuration: number;
        totalSessions: number;
    }, {
        attendanceRate: number;
        avgSessionDuration: number;
        totalSessions: number;
    }>;
    noShowRate: z.ZodNumber;
    repeatMentoring: z.ZodObject<{
        uniqueMentors: z.ZodNumber;
        uniqueMentees: z.ZodNumber;
        avgSessionsPerMentee: z.ZodNumber;
        mentorsWithMultipleSessions: z.ZodNumber;
        repeatRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        uniqueMentors: number;
        uniqueMentees: number;
        avgSessionsPerMentee: number;
        mentorsWithMultipleSessions: number;
        repeatRate: number;
    }, {
        uniqueMentors: number;
        uniqueMentees: number;
        avgSessionsPerMentee: number;
        mentorsWithMultipleSessions: number;
        repeatRate: number;
    }>;
    feedback: z.ZodOptional<z.ZodObject<{
        avgMentorRating: z.ZodOptional<z.ZodNumber>;
        avgMenteeRating: z.ZodOptional<z.ZodNumber>;
        feedbackCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        feedbackCount: number;
        avgMentorRating?: number | undefined;
        avgMenteeRating?: number | undefined;
    }, {
        feedbackCount: number;
        avgMentorRating?: number | undefined;
        avgMenteeRating?: number | undefined;
    }>>;
    vis: z.ZodOptional<z.ZodNumber>;
    sroi: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    bookings: {
        completed: number;
        total: number;
        scheduled: number;
        cancelled: number;
    };
    attendance: {
        attendanceRate: number;
        avgSessionDuration: number;
        totalSessions: number;
    };
    noShowRate: number;
    repeatMentoring: {
        uniqueMentors: number;
        uniqueMentees: number;
        avgSessionsPerMentee: number;
        mentorsWithMultipleSessions: number;
        repeatRate: number;
    };
    vis?: number | undefined;
    sroi?: number | undefined;
    feedback?: {
        feedbackCount: number;
        avgMentorRating?: number | undefined;
        avgMenteeRating?: number | undefined;
    } | undefined;
}, {
    bookings: {
        completed: number;
        total: number;
        scheduled: number;
        cancelled: number;
    };
    attendance: {
        attendanceRate: number;
        avgSessionDuration: number;
        totalSessions: number;
    };
    noShowRate: number;
    repeatMentoring: {
        uniqueMentors: number;
        uniqueMentees: number;
        avgSessionsPerMentee: number;
        mentorsWithMultipleSessions: number;
        repeatRate: number;
    };
    vis?: number | undefined;
    sroi?: number | undefined;
    feedback?: {
        feedbackCount: number;
        avgMentorRating?: number | undefined;
        avgMenteeRating?: number | undefined;
    } | undefined;
}>;
export type MentorshipTileData = z.infer<typeof MentorshipTileDataSchema>;
export declare const MentorshipTileSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        bookings: z.ZodObject<{
            total: z.ZodNumber;
            scheduled: z.ZodNumber;
            completed: z.ZodNumber;
            cancelled: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        }, {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        }>;
        attendance: z.ZodObject<{
            attendanceRate: z.ZodNumber;
            avgSessionDuration: z.ZodNumber;
            totalSessions: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        }, {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        }>;
        noShowRate: z.ZodNumber;
        repeatMentoring: z.ZodObject<{
            uniqueMentors: z.ZodNumber;
            uniqueMentees: z.ZodNumber;
            avgSessionsPerMentee: z.ZodNumber;
            mentorsWithMultipleSessions: z.ZodNumber;
            repeatRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        }, {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        }>;
        feedback: z.ZodOptional<z.ZodObject<{
            avgMentorRating: z.ZodOptional<z.ZodNumber>;
            avgMenteeRating: z.ZodOptional<z.ZodNumber>;
            feedbackCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        }, {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    }, {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    };
}>;
export type MentorshipTile = z.infer<typeof MentorshipTileSchema>;
export declare const UpskillingTileDataSchema: z.ZodObject<{
    funnel: z.ZodObject<{
        enrollments: z.ZodNumber;
        inProgress: z.ZodNumber;
        completions: z.ZodNumber;
        placements: z.ZodNumber;
        completionRate: z.ZodNumber;
        placementRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        enrollments: number;
        completions: number;
        inProgress: number;
        placements: number;
        completionRate: number;
        placementRate: number;
    }, {
        enrollments: number;
        completions: number;
        inProgress: number;
        placements: number;
        completionRate: number;
        placementRate: number;
    }>;
    locales: z.ZodObject<{
        UA: z.ZodOptional<z.ZodNumber>;
        EN: z.ZodOptional<z.ZodNumber>;
        DE: z.ZodOptional<z.ZodNumber>;
        NO: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        UA?: number | undefined;
        EN?: number | undefined;
        DE?: number | undefined;
        NO?: number | undefined;
    }, {
        UA?: number | undefined;
        EN?: number | undefined;
        DE?: number | undefined;
        NO?: number | undefined;
    }>;
    courses: z.ZodObject<{
        totalCourses: z.ZodNumber;
        activeCourses: z.ZodNumber;
        avgCourseDuration: z.ZodNumber;
        topCourses: z.ZodOptional<z.ZodArray<z.ZodObject<{
            courseName: z.ZodString;
            enrollments: z.ZodNumber;
            completionRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            completionRate: number;
            courseName: string;
        }, {
            enrollments: number;
            completionRate: number;
            courseName: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        totalCourses: number;
        activeCourses: number;
        avgCourseDuration: number;
        topCourses?: {
            enrollments: number;
            completionRate: number;
            courseName: string;
        }[] | undefined;
    }, {
        totalCourses: number;
        activeCourses: number;
        avgCourseDuration: number;
        topCourses?: {
            enrollments: number;
            completionRate: number;
            courseName: string;
        }[] | undefined;
    }>;
    skills: z.ZodOptional<z.ZodObject<{
        totalSkillsAcquired: z.ZodNumber;
        avgSkillsPerLearner: z.ZodNumber;
        topSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        totalSkillsAcquired: number;
        avgSkillsPerLearner: number;
        topSkills?: string[] | undefined;
    }, {
        totalSkillsAcquired: number;
        avgSkillsPerLearner: number;
        topSkills?: string[] | undefined;
    }>>;
    vis: z.ZodOptional<z.ZodNumber>;
    sroi: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    funnel: {
        enrollments: number;
        completions: number;
        inProgress: number;
        placements: number;
        completionRate: number;
        placementRate: number;
    };
    locales: {
        UA?: number | undefined;
        EN?: number | undefined;
        DE?: number | undefined;
        NO?: number | undefined;
    };
    courses: {
        totalCourses: number;
        activeCourses: number;
        avgCourseDuration: number;
        topCourses?: {
            enrollments: number;
            completionRate: number;
            courseName: string;
        }[] | undefined;
    };
    vis?: number | undefined;
    sroi?: number | undefined;
    skills?: {
        totalSkillsAcquired: number;
        avgSkillsPerLearner: number;
        topSkills?: string[] | undefined;
    } | undefined;
}, {
    funnel: {
        enrollments: number;
        completions: number;
        inProgress: number;
        placements: number;
        completionRate: number;
        placementRate: number;
    };
    locales: {
        UA?: number | undefined;
        EN?: number | undefined;
        DE?: number | undefined;
        NO?: number | undefined;
    };
    courses: {
        totalCourses: number;
        activeCourses: number;
        avgCourseDuration: number;
        topCourses?: {
            enrollments: number;
            completionRate: number;
            courseName: string;
        }[] | undefined;
    };
    vis?: number | undefined;
    sroi?: number | undefined;
    skills?: {
        totalSkillsAcquired: number;
        avgSkillsPerLearner: number;
        topSkills?: string[] | undefined;
    } | undefined;
}>;
export type UpskillingTileData = z.infer<typeof UpskillingTileDataSchema>;
export declare const UpskillingTileSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        funnel: z.ZodObject<{
            enrollments: z.ZodNumber;
            inProgress: z.ZodNumber;
            completions: z.ZodNumber;
            placements: z.ZodNumber;
            completionRate: z.ZodNumber;
            placementRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        }, {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        }>;
        locales: z.ZodObject<{
            UA: z.ZodOptional<z.ZodNumber>;
            EN: z.ZodOptional<z.ZodNumber>;
            DE: z.ZodOptional<z.ZodNumber>;
            NO: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        }, {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        }>;
        courses: z.ZodObject<{
            totalCourses: z.ZodNumber;
            activeCourses: z.ZodNumber;
            avgCourseDuration: z.ZodNumber;
            topCourses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                courseName: z.ZodString;
                enrollments: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }, {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        }, {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        }>;
        skills: z.ZodOptional<z.ZodObject<{
            totalSkillsAcquired: z.ZodNumber;
            avgSkillsPerLearner: z.ZodNumber;
            topSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        }, {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    }, {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    };
}>;
export type UpskillingTile = z.infer<typeof UpskillingTileSchema>;
export declare const WEEITileDataSchema: z.ZodObject<{
    stages: z.ZodObject<{
        ULEARN: z.ZodObject<{
            enrollments: z.ZodNumber;
            completions: z.ZodNumber;
            completionRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }>;
        USTART: z.ZodObject<{
            enrollments: z.ZodNumber;
            completions: z.ZodNumber;
            completionRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }>;
        UGROW: z.ZodObject<{
            enrollments: z.ZodNumber;
            completions: z.ZodNumber;
            completionRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }>;
        ULEAD: z.ZodObject<{
            enrollments: z.ZodNumber;
            completions: z.ZodNumber;
            completionRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }, {
            enrollments: number;
            completions: number;
            completionRate: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        ULEARN: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        USTART: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        UGROW: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        ULEAD: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
    }, {
        ULEARN: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        USTART: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        UGROW: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        ULEAD: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
    }>;
    throughput: z.ZodObject<{
        totalEnrollments: z.ZodNumber;
        totalCompletions: z.ZodNumber;
        overallCompletionRate: z.ZodNumber;
        avgTimeToComplete: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalEnrollments: number;
        totalCompletions: number;
        overallCompletionRate: number;
        avgTimeToComplete: number;
    }, {
        totalEnrollments: number;
        totalCompletions: number;
        overallCompletionRate: number;
        avgTimeToComplete: number;
    }>;
    demoDay: z.ZodObject<{
        demoDayCount: z.ZodNumber;
        totalPresentations: z.ZodNumber;
        uniqueParticipants: z.ZodNumber;
        avgPresentationsPerDemoDay: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        demoDayCount: number;
        totalPresentations: number;
        uniqueParticipants: number;
        avgPresentationsPerDemoDay: number;
    }, {
        demoDayCount: number;
        totalPresentations: number;
        uniqueParticipants: number;
        avgPresentationsPerDemoDay: number;
    }>;
    progression: z.ZodObject<{
        learnToStart: z.ZodNumber;
        startToGrow: z.ZodNumber;
        growToLead: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        learnToStart: number;
        startToGrow: number;
        growToLead: number;
    }, {
        learnToStart: number;
        startToGrow: number;
        growToLead: number;
    }>;
    businessOutcomes: z.ZodOptional<z.ZodObject<{
        businessesStarted: z.ZodNumber;
        jobsCreated: z.ZodNumber;
        revenueGenerated: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        businessesStarted: number;
        jobsCreated: number;
        revenueGenerated?: number | undefined;
    }, {
        businessesStarted: number;
        jobsCreated: number;
        revenueGenerated?: number | undefined;
    }>>;
    vis: z.ZodOptional<z.ZodNumber>;
    sroi: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    stages: {
        ULEARN: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        USTART: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        UGROW: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        ULEAD: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
    };
    throughput: {
        totalEnrollments: number;
        totalCompletions: number;
        overallCompletionRate: number;
        avgTimeToComplete: number;
    };
    demoDay: {
        demoDayCount: number;
        totalPresentations: number;
        uniqueParticipants: number;
        avgPresentationsPerDemoDay: number;
    };
    progression: {
        learnToStart: number;
        startToGrow: number;
        growToLead: number;
    };
    vis?: number | undefined;
    sroi?: number | undefined;
    businessOutcomes?: {
        businessesStarted: number;
        jobsCreated: number;
        revenueGenerated?: number | undefined;
    } | undefined;
}, {
    stages: {
        ULEARN: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        USTART: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        UGROW: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
        ULEAD: {
            enrollments: number;
            completions: number;
            completionRate: number;
        };
    };
    throughput: {
        totalEnrollments: number;
        totalCompletions: number;
        overallCompletionRate: number;
        avgTimeToComplete: number;
    };
    demoDay: {
        demoDayCount: number;
        totalPresentations: number;
        uniqueParticipants: number;
        avgPresentationsPerDemoDay: number;
    };
    progression: {
        learnToStart: number;
        startToGrow: number;
        growToLead: number;
    };
    vis?: number | undefined;
    sroi?: number | undefined;
    businessOutcomes?: {
        businessesStarted: number;
        jobsCreated: number;
        revenueGenerated?: number | undefined;
    } | undefined;
}>;
export type WEEITileData = z.infer<typeof WEEITileDataSchema>;
export declare const WEEITileSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        stages: z.ZodObject<{
            ULEARN: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
            USTART: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
            UGROW: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
            ULEAD: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        }, {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        }>;
        throughput: z.ZodObject<{
            totalEnrollments: z.ZodNumber;
            totalCompletions: z.ZodNumber;
            overallCompletionRate: z.ZodNumber;
            avgTimeToComplete: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        }, {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        }>;
        demoDay: z.ZodObject<{
            demoDayCount: z.ZodNumber;
            totalPresentations: z.ZodNumber;
            uniqueParticipants: z.ZodNumber;
            avgPresentationsPerDemoDay: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        }, {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        }>;
        progression: z.ZodObject<{
            learnToStart: z.ZodNumber;
            startToGrow: z.ZodNumber;
            growToLead: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        }, {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        }>;
        businessOutcomes: z.ZodOptional<z.ZodObject<{
            businessesStarted: z.ZodNumber;
            jobsCreated: z.ZodNumber;
            revenueGenerated: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        }, {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    }, {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    };
}>;
export type WEEITile = z.infer<typeof WEEITileSchema>;
export declare const TileResultSchema: z.ZodUnion<[z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        sessionsPerWeek: z.ZodNumber;
        targetSessionsPerWeek: z.ZodDefault<z.ZodNumber>;
        cohortDurationWeeks: z.ZodNumber;
        targetDurationWeeks: z.ZodDefault<z.ZodNumber>;
        volunteerHours: z.ZodObject<{
            total: z.ZodNumber;
            perSession: z.ZodNumber;
            uniqueVolunteers: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        }, {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        }>;
        retention: z.ZodObject<{
            enrollments: z.ZodNumber;
            activeParticipants: z.ZodNumber;
            completions: z.ZodNumber;
            dropoutRate: z.ZodNumber;
            retentionRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        }, {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        }>;
        languageLevels: z.ZodOptional<z.ZodObject<{
            averageStartLevel: z.ZodOptional<z.ZodString>;
            averageCurrentLevel: z.ZodOptional<z.ZodString>;
            progressionRate: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        }, {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sessionsPerWeek: number;
        targetSessionsPerWeek: number;
        cohortDurationWeeks: number;
        targetDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    }, {
        sessionsPerWeek: number;
        cohortDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        targetSessionsPerWeek?: number | undefined;
        targetDurationWeeks?: number | undefined;
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        sessionsPerWeek: number;
        targetSessionsPerWeek: number;
        cohortDurationWeeks: number;
        targetDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        sessionsPerWeek: number;
        cohortDurationWeeks: number;
        volunteerHours: {
            total: number;
            perSession: number;
            uniqueVolunteers: number;
        };
        retention: {
            enrollments: number;
            activeParticipants: number;
            completions: number;
            dropoutRate: number;
            retentionRate: number;
        };
        targetSessionsPerWeek?: number | undefined;
        targetDurationWeeks?: number | undefined;
        languageLevels?: {
            averageStartLevel?: string | undefined;
            averageCurrentLevel?: string | undefined;
            progressionRate?: number | undefined;
        } | undefined;
        vis?: number | undefined;
        sroi?: number | undefined;
    };
}>, z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        bookings: z.ZodObject<{
            total: z.ZodNumber;
            scheduled: z.ZodNumber;
            completed: z.ZodNumber;
            cancelled: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        }, {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        }>;
        attendance: z.ZodObject<{
            attendanceRate: z.ZodNumber;
            avgSessionDuration: z.ZodNumber;
            totalSessions: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        }, {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        }>;
        noShowRate: z.ZodNumber;
        repeatMentoring: z.ZodObject<{
            uniqueMentors: z.ZodNumber;
            uniqueMentees: z.ZodNumber;
            avgSessionsPerMentee: z.ZodNumber;
            mentorsWithMultipleSessions: z.ZodNumber;
            repeatRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        }, {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        }>;
        feedback: z.ZodOptional<z.ZodObject<{
            avgMentorRating: z.ZodOptional<z.ZodNumber>;
            avgMenteeRating: z.ZodOptional<z.ZodNumber>;
            feedbackCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        }, {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    }, {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        bookings: {
            completed: number;
            total: number;
            scheduled: number;
            cancelled: number;
        };
        attendance: {
            attendanceRate: number;
            avgSessionDuration: number;
            totalSessions: number;
        };
        noShowRate: number;
        repeatMentoring: {
            uniqueMentors: number;
            uniqueMentees: number;
            avgSessionsPerMentee: number;
            mentorsWithMultipleSessions: number;
            repeatRate: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        feedback?: {
            feedbackCount: number;
            avgMentorRating?: number | undefined;
            avgMenteeRating?: number | undefined;
        } | undefined;
    };
}>, z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        funnel: z.ZodObject<{
            enrollments: z.ZodNumber;
            inProgress: z.ZodNumber;
            completions: z.ZodNumber;
            placements: z.ZodNumber;
            completionRate: z.ZodNumber;
            placementRate: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        }, {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        }>;
        locales: z.ZodObject<{
            UA: z.ZodOptional<z.ZodNumber>;
            EN: z.ZodOptional<z.ZodNumber>;
            DE: z.ZodOptional<z.ZodNumber>;
            NO: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        }, {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        }>;
        courses: z.ZodObject<{
            totalCourses: z.ZodNumber;
            activeCourses: z.ZodNumber;
            avgCourseDuration: z.ZodNumber;
            topCourses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                courseName: z.ZodString;
                enrollments: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }, {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        }, {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        }>;
        skills: z.ZodOptional<z.ZodObject<{
            totalSkillsAcquired: z.ZodNumber;
            avgSkillsPerLearner: z.ZodNumber;
            topSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        }, {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    }, {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        funnel: {
            enrollments: number;
            completions: number;
            inProgress: number;
            placements: number;
            completionRate: number;
            placementRate: number;
        };
        locales: {
            UA?: number | undefined;
            EN?: number | undefined;
            DE?: number | undefined;
            NO?: number | undefined;
        };
        courses: {
            totalCourses: number;
            activeCourses: number;
            avgCourseDuration: number;
            topCourses?: {
                enrollments: number;
                completionRate: number;
                courseName: string;
            }[] | undefined;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        skills?: {
            totalSkillsAcquired: number;
            avgSkillsPerLearner: number;
            topSkills?: string[] | undefined;
        } | undefined;
    };
}>, z.ZodObject<{
    metadata: z.ZodObject<{
        tileId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
        calculatedAt: z.ZodString;
        dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
    }, "strip", z.ZodTypeAny, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }, {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    }>;
    data: z.ZodObject<{
        stages: z.ZodObject<{
            ULEARN: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
            USTART: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
            UGROW: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
            ULEAD: z.ZodObject<{
                enrollments: z.ZodNumber;
                completions: z.ZodNumber;
                completionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }, {
                enrollments: number;
                completions: number;
                completionRate: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        }, {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        }>;
        throughput: z.ZodObject<{
            totalEnrollments: z.ZodNumber;
            totalCompletions: z.ZodNumber;
            overallCompletionRate: z.ZodNumber;
            avgTimeToComplete: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        }, {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        }>;
        demoDay: z.ZodObject<{
            demoDayCount: z.ZodNumber;
            totalPresentations: z.ZodNumber;
            uniqueParticipants: z.ZodNumber;
            avgPresentationsPerDemoDay: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        }, {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        }>;
        progression: z.ZodObject<{
            learnToStart: z.ZodNumber;
            startToGrow: z.ZodNumber;
            growToLead: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        }, {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        }>;
        businessOutcomes: z.ZodOptional<z.ZodObject<{
            businessesStarted: z.ZodNumber;
            jobsCreated: z.ZodNumber;
            revenueGenerated: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        }, {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        }>>;
        vis: z.ZodOptional<z.ZodNumber>;
        sroi: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    }, {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    };
}, {
    metadata: {
        companyId: string;
        period: {
            start: string;
            end: string;
        };
        programType: "language" | "mentorship" | "upskilling" | "weei";
        tileId: string;
        calculatedAt: string;
        dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
    };
    data: {
        stages: {
            ULEARN: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            USTART: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            UGROW: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
            ULEAD: {
                enrollments: number;
                completions: number;
                completionRate: number;
            };
        };
        throughput: {
            totalEnrollments: number;
            totalCompletions: number;
            overallCompletionRate: number;
            avgTimeToComplete: number;
        };
        demoDay: {
            demoDayCount: number;
            totalPresentations: number;
            uniqueParticipants: number;
            avgPresentationsPerDemoDay: number;
        };
        progression: {
            learnToStart: number;
            startToGrow: number;
            growToLead: number;
        };
        vis?: number | undefined;
        sroi?: number | undefined;
        businessOutcomes?: {
            businessesStarted: number;
            jobsCreated: number;
            revenueGenerated?: number | undefined;
        } | undefined;
    };
}>]>;
export type TileResult = z.infer<typeof TileResultSchema>;
export declare const GetTileRequestSchema: z.ZodObject<{
    companyId: z.ZodString;
    tileType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
    includeBreakdown: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    tileType: "language" | "mentorship" | "upskilling" | "weei";
    includeBreakdown: boolean;
    period?: {
        start: string;
        end: string;
    } | undefined;
}, {
    companyId: string;
    tileType: "language" | "mentorship" | "upskilling" | "weei";
    period?: {
        start: string;
        end: string;
    } | undefined;
    includeBreakdown?: boolean | undefined;
}>;
export type GetTileRequest = z.infer<typeof GetTileRequestSchema>;
export declare const GetTileResponseSchema: z.ZodObject<{
    tile: z.ZodUnion<[z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            sessionsPerWeek: z.ZodNumber;
            targetSessionsPerWeek: z.ZodDefault<z.ZodNumber>;
            cohortDurationWeeks: z.ZodNumber;
            targetDurationWeeks: z.ZodDefault<z.ZodNumber>;
            volunteerHours: z.ZodObject<{
                total: z.ZodNumber;
                perSession: z.ZodNumber;
                uniqueVolunteers: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            }, {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            }>;
            retention: z.ZodObject<{
                enrollments: z.ZodNumber;
                activeParticipants: z.ZodNumber;
                completions: z.ZodNumber;
                dropoutRate: z.ZodNumber;
                retentionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            }, {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            }>;
            languageLevels: z.ZodOptional<z.ZodObject<{
                averageStartLevel: z.ZodOptional<z.ZodString>;
                averageCurrentLevel: z.ZodOptional<z.ZodString>;
                progressionRate: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            }, {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            sessionsPerWeek: number;
            targetSessionsPerWeek: number;
            cohortDurationWeeks: number;
            targetDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        }, {
            sessionsPerWeek: number;
            cohortDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            targetSessionsPerWeek?: number | undefined;
            targetDurationWeeks?: number | undefined;
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            targetSessionsPerWeek: number;
            cohortDurationWeeks: number;
            targetDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            cohortDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            targetSessionsPerWeek?: number | undefined;
            targetDurationWeeks?: number | undefined;
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    }>, z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            bookings: z.ZodObject<{
                total: z.ZodNumber;
                scheduled: z.ZodNumber;
                completed: z.ZodNumber;
                cancelled: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            }, {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            }>;
            attendance: z.ZodObject<{
                attendanceRate: z.ZodNumber;
                avgSessionDuration: z.ZodNumber;
                totalSessions: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            }, {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            }>;
            noShowRate: z.ZodNumber;
            repeatMentoring: z.ZodObject<{
                uniqueMentors: z.ZodNumber;
                uniqueMentees: z.ZodNumber;
                avgSessionsPerMentee: z.ZodNumber;
                mentorsWithMultipleSessions: z.ZodNumber;
                repeatRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            }, {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            }>;
            feedback: z.ZodOptional<z.ZodObject<{
                avgMentorRating: z.ZodOptional<z.ZodNumber>;
                avgMenteeRating: z.ZodOptional<z.ZodNumber>;
                feedbackCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            }, {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        }, {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            funnel: z.ZodObject<{
                enrollments: z.ZodNumber;
                inProgress: z.ZodNumber;
                completions: z.ZodNumber;
                placements: z.ZodNumber;
                completionRate: z.ZodNumber;
                placementRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            }, {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            }>;
            locales: z.ZodObject<{
                UA: z.ZodOptional<z.ZodNumber>;
                EN: z.ZodOptional<z.ZodNumber>;
                DE: z.ZodOptional<z.ZodNumber>;
                NO: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            }, {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            }>;
            courses: z.ZodObject<{
                totalCourses: z.ZodNumber;
                activeCourses: z.ZodNumber;
                avgCourseDuration: z.ZodNumber;
                topCourses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    courseName: z.ZodString;
                    enrollments: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }, {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            }, {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            }>;
            skills: z.ZodOptional<z.ZodObject<{
                totalSkillsAcquired: z.ZodNumber;
                avgSkillsPerLearner: z.ZodNumber;
                topSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            }, {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        }, {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            stages: z.ZodObject<{
                ULEARN: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
                USTART: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
                UGROW: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
                ULEAD: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            }, {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            }>;
            throughput: z.ZodObject<{
                totalEnrollments: z.ZodNumber;
                totalCompletions: z.ZodNumber;
                overallCompletionRate: z.ZodNumber;
                avgTimeToComplete: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            }, {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            }>;
            demoDay: z.ZodObject<{
                demoDayCount: z.ZodNumber;
                totalPresentations: z.ZodNumber;
                uniqueParticipants: z.ZodNumber;
                avgPresentationsPerDemoDay: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            }, {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            }>;
            progression: z.ZodObject<{
                learnToStart: z.ZodNumber;
                startToGrow: z.ZodNumber;
                growToLead: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            }, {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            }>;
            businessOutcomes: z.ZodOptional<z.ZodObject<{
                businessesStarted: z.ZodNumber;
                jobsCreated: z.ZodNumber;
                revenueGenerated: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            }, {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        }, {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    }>]>;
    entitlements: z.ZodObject<{
        canExport: z.ZodBoolean;
        canViewDetails: z.ZodBoolean;
        canViewBenchmarks: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        canExport: boolean;
        canViewDetails: boolean;
        canViewBenchmarks: boolean;
    }, {
        canExport: boolean;
        canViewDetails: boolean;
        canViewBenchmarks: boolean;
    }>;
    cacheTTL: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tile: {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            targetSessionsPerWeek: number;
            cohortDurationWeeks: number;
            targetDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    };
    entitlements: {
        canExport: boolean;
        canViewDetails: boolean;
        canViewBenchmarks: boolean;
    };
    cacheTTL: number;
}, {
    tile: {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            cohortDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            targetSessionsPerWeek?: number | undefined;
            targetDurationWeeks?: number | undefined;
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    };
    entitlements: {
        canExport: boolean;
        canViewDetails: boolean;
        canViewBenchmarks: boolean;
    };
    cacheTTL: number;
}>;
export type GetTileResponse = z.infer<typeof GetTileResponseSchema>;
export declare const GetTilesListResponseSchema: z.ZodObject<{
    companyId: z.ZodString;
    tiles: z.ZodArray<z.ZodUnion<[z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            sessionsPerWeek: z.ZodNumber;
            targetSessionsPerWeek: z.ZodDefault<z.ZodNumber>;
            cohortDurationWeeks: z.ZodNumber;
            targetDurationWeeks: z.ZodDefault<z.ZodNumber>;
            volunteerHours: z.ZodObject<{
                total: z.ZodNumber;
                perSession: z.ZodNumber;
                uniqueVolunteers: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            }, {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            }>;
            retention: z.ZodObject<{
                enrollments: z.ZodNumber;
                activeParticipants: z.ZodNumber;
                completions: z.ZodNumber;
                dropoutRate: z.ZodNumber;
                retentionRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            }, {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            }>;
            languageLevels: z.ZodOptional<z.ZodObject<{
                averageStartLevel: z.ZodOptional<z.ZodString>;
                averageCurrentLevel: z.ZodOptional<z.ZodString>;
                progressionRate: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            }, {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            sessionsPerWeek: number;
            targetSessionsPerWeek: number;
            cohortDurationWeeks: number;
            targetDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        }, {
            sessionsPerWeek: number;
            cohortDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            targetSessionsPerWeek?: number | undefined;
            targetDurationWeeks?: number | undefined;
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            targetSessionsPerWeek: number;
            cohortDurationWeeks: number;
            targetDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            cohortDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            targetSessionsPerWeek?: number | undefined;
            targetDurationWeeks?: number | undefined;
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    }>, z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            bookings: z.ZodObject<{
                total: z.ZodNumber;
                scheduled: z.ZodNumber;
                completed: z.ZodNumber;
                cancelled: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            }, {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            }>;
            attendance: z.ZodObject<{
                attendanceRate: z.ZodNumber;
                avgSessionDuration: z.ZodNumber;
                totalSessions: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            }, {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            }>;
            noShowRate: z.ZodNumber;
            repeatMentoring: z.ZodObject<{
                uniqueMentors: z.ZodNumber;
                uniqueMentees: z.ZodNumber;
                avgSessionsPerMentee: z.ZodNumber;
                mentorsWithMultipleSessions: z.ZodNumber;
                repeatRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            }, {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            }>;
            feedback: z.ZodOptional<z.ZodObject<{
                avgMentorRating: z.ZodOptional<z.ZodNumber>;
                avgMenteeRating: z.ZodOptional<z.ZodNumber>;
                feedbackCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            }, {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        }, {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            funnel: z.ZodObject<{
                enrollments: z.ZodNumber;
                inProgress: z.ZodNumber;
                completions: z.ZodNumber;
                placements: z.ZodNumber;
                completionRate: z.ZodNumber;
                placementRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            }, {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            }>;
            locales: z.ZodObject<{
                UA: z.ZodOptional<z.ZodNumber>;
                EN: z.ZodOptional<z.ZodNumber>;
                DE: z.ZodOptional<z.ZodNumber>;
                NO: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            }, {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            }>;
            courses: z.ZodObject<{
                totalCourses: z.ZodNumber;
                activeCourses: z.ZodNumber;
                avgCourseDuration: z.ZodNumber;
                topCourses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    courseName: z.ZodString;
                    enrollments: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }, {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            }, {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            }>;
            skills: z.ZodOptional<z.ZodObject<{
                totalSkillsAcquired: z.ZodNumber;
                avgSkillsPerLearner: z.ZodNumber;
                topSkills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            }, {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        }, {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        metadata: z.ZodObject<{
            tileId: z.ZodString;
            companyId: z.ZodString;
            programType: z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>;
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
            calculatedAt: z.ZodString;
            dataFreshness: z.ZodEnum<["realtime", "cached_5m", "cached_1h", "cached_24h"]>;
        }, "strip", z.ZodTypeAny, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }, {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        }>;
        data: z.ZodObject<{
            stages: z.ZodObject<{
                ULEARN: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
                USTART: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
                UGROW: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
                ULEAD: z.ZodObject<{
                    enrollments: z.ZodNumber;
                    completions: z.ZodNumber;
                    completionRate: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }, {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            }, {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            }>;
            throughput: z.ZodObject<{
                totalEnrollments: z.ZodNumber;
                totalCompletions: z.ZodNumber;
                overallCompletionRate: z.ZodNumber;
                avgTimeToComplete: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            }, {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            }>;
            demoDay: z.ZodObject<{
                demoDayCount: z.ZodNumber;
                totalPresentations: z.ZodNumber;
                uniqueParticipants: z.ZodNumber;
                avgPresentationsPerDemoDay: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            }, {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            }>;
            progression: z.ZodObject<{
                learnToStart: z.ZodNumber;
                startToGrow: z.ZodNumber;
                growToLead: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            }, {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            }>;
            businessOutcomes: z.ZodOptional<z.ZodObject<{
                businessesStarted: z.ZodNumber;
                jobsCreated: z.ZodNumber;
                revenueGenerated: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            }, {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            }>>;
            vis: z.ZodOptional<z.ZodNumber>;
            sroi: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        }, {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    }, {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    }>]>, "many">;
    availableTileTypes: z.ZodArray<z.ZodEnum<["language", "mentorship", "upskilling", "weei"]>, "many">;
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
}, "strip", z.ZodTypeAny, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    tiles: ({
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            targetSessionsPerWeek: number;
            cohortDurationWeeks: number;
            targetDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    })[];
    availableTileTypes: ("language" | "mentorship" | "upskilling" | "weei")[];
}, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    tiles: ({
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            sessionsPerWeek: number;
            cohortDurationWeeks: number;
            volunteerHours: {
                total: number;
                perSession: number;
                uniqueVolunteers: number;
            };
            retention: {
                enrollments: number;
                activeParticipants: number;
                completions: number;
                dropoutRate: number;
                retentionRate: number;
            };
            targetSessionsPerWeek?: number | undefined;
            targetDurationWeeks?: number | undefined;
            languageLevels?: {
                averageStartLevel?: string | undefined;
                averageCurrentLevel?: string | undefined;
                progressionRate?: number | undefined;
            } | undefined;
            vis?: number | undefined;
            sroi?: number | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            bookings: {
                completed: number;
                total: number;
                scheduled: number;
                cancelled: number;
            };
            attendance: {
                attendanceRate: number;
                avgSessionDuration: number;
                totalSessions: number;
            };
            noShowRate: number;
            repeatMentoring: {
                uniqueMentors: number;
                uniqueMentees: number;
                avgSessionsPerMentee: number;
                mentorsWithMultipleSessions: number;
                repeatRate: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            feedback?: {
                feedbackCount: number;
                avgMentorRating?: number | undefined;
                avgMenteeRating?: number | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            funnel: {
                enrollments: number;
                completions: number;
                inProgress: number;
                placements: number;
                completionRate: number;
                placementRate: number;
            };
            locales: {
                UA?: number | undefined;
                EN?: number | undefined;
                DE?: number | undefined;
                NO?: number | undefined;
            };
            courses: {
                totalCourses: number;
                activeCourses: number;
                avgCourseDuration: number;
                topCourses?: {
                    enrollments: number;
                    completionRate: number;
                    courseName: string;
                }[] | undefined;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            skills?: {
                totalSkillsAcquired: number;
                avgSkillsPerLearner: number;
                topSkills?: string[] | undefined;
            } | undefined;
        };
    } | {
        metadata: {
            companyId: string;
            period: {
                start: string;
                end: string;
            };
            programType: "language" | "mentorship" | "upskilling" | "weei";
            tileId: string;
            calculatedAt: string;
            dataFreshness: "realtime" | "cached_5m" | "cached_1h" | "cached_24h";
        };
        data: {
            stages: {
                ULEARN: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                USTART: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                UGROW: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
                ULEAD: {
                    enrollments: number;
                    completions: number;
                    completionRate: number;
                };
            };
            throughput: {
                totalEnrollments: number;
                totalCompletions: number;
                overallCompletionRate: number;
                avgTimeToComplete: number;
            };
            demoDay: {
                demoDayCount: number;
                totalPresentations: number;
                uniqueParticipants: number;
                avgPresentationsPerDemoDay: number;
            };
            progression: {
                learnToStart: number;
                startToGrow: number;
                growToLead: number;
            };
            vis?: number | undefined;
            sroi?: number | undefined;
            businessOutcomes?: {
                businessesStarted: number;
                jobsCreated: number;
                revenueGenerated?: number | undefined;
            } | undefined;
        };
    })[];
    availableTileTypes: ("language" | "mentorship" | "upskilling" | "weei")[];
}>;
export type GetTilesListResponse = z.infer<typeof GetTilesListResponseSchema>;
//# sourceMappingURL=tiles.d.ts.map