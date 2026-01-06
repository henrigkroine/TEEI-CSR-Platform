/**
 * NLQ Accessibility Components
 * Centralized exports for all NLQ accessibility features
 * WCAG 2.2 AA Compliance
 */

// Focus Management
export {
  RovingTabindexManager,
  QueryHistoryFocus,
  SuggestionsFocus,
  SearchInputFocus,
  AnswerCardFocus,
  useNLQFocusRestore,
} from './FocusManager';

// Live Announcements
export {
  NLQAnnouncer,
  QueryStatusAnnouncer,
  ConfidenceAnnouncer,
  ResultLoadingAnnouncer,
  SuggestionAnnouncer,
  FilterAnnouncer,
  ExportAnnouncer,
  LineageAnnouncer,
  FeedbackAnnouncer,
} from './LiveAnnouncer';

// Skip Links & Navigation
export {
  NLQSkipLinks,
  NLQBreadcrumbs,
  LandmarkWrapper,
  QuickNav,
  NLQ_FOCUS_REGIONS,
  type FocusRegion,
} from './SkipLinks';
