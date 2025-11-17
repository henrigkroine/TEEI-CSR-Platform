// Base types
export * from './base.js';

// Domain events
export * from './buddy/index.js';
export * from './kintell/index.js';
export * from './upskilling/index.js';
export * from './orchestration/index.js';
export * from './safety/index.js';
export * from './nlq/index.js';
export * from './reporting/index.js';

// Convenience type for all events
import type {
  BuddyMatchCreated,
  BuddyEventLogged,
  BuddyCheckinCompleted,
  BuddyFeedbackSubmitted,
} from './buddy/index.js';
import type {
  KintellSessionCompleted,
  KintellRatingCreated,
  KintellSessionScheduled,
} from './kintell/index.js';
import type {
  UpskillingCourseCompleted,
  UpskillingCredentialIssued,
  UpskillingProgressUpdated,
} from './upskilling/index.js';
import type {
  OrchestrationJourneyMilestoneReached,
  OrchestrationProfileUpdated,
} from './orchestration/index.js';
import type { SafetyFlagRaised, SafetyReviewCompleted } from './safety/index.js';
import type {
  NLQQueryStarted,
  NLQQueryCompleted,
  NLQQueryFailed,
  NLQQueryRejected,
  NLQCacheInvalidated,
} from './nlq/index.js';
import type {
  CitationEditedEvent,
  RedactionCompletedEvent,
  EvidenceGateViolationEvent,
} from './reporting/index.js';

export type DomainEvent =
  | BuddyMatchCreated
  | BuddyEventLogged
  | BuddyCheckinCompleted
  | BuddyFeedbackSubmitted
  | KintellSessionCompleted
  | KintellRatingCreated
  | KintellSessionScheduled
  | UpskillingCourseCompleted
  | UpskillingCredentialIssued
  | UpskillingProgressUpdated
  | OrchestrationJourneyMilestoneReached
  | OrchestrationProfileUpdated
  | SafetyFlagRaised
  | SafetyReviewCompleted
  | NLQQueryStarted
  | NLQQueryCompleted
  | NLQQueryFailed
  | NLQQueryRejected
  | NLQCacheInvalidated
  | CitationEditedEvent
  | RedactionCompletedEvent
  | EvidenceGateViolationEvent;
