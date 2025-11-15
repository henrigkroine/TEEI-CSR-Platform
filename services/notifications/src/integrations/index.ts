/**
 * Notification Integrations Index
 *
 * Exports all integration functions for Slack, Teams, and SMTP domain management
 */

// Slack integration
export {
  sendSlackMessage,
  sendSLABreachAlert as sendSlackSLABreachAlert,
  sendApprovalNotification as sendSlackApprovalNotification,
  sendDeliveryFailureAlert as sendSlackDeliveryFailureAlert,
  sendSyntheticMonitorAlert as sendSlackSyntheticMonitorAlert,
  type SlackMessage,
  type SlackSeverity,
  type SlackAlertType,
} from './slack';

// Teams integration
export {
  sendTeamsMessage,
  sendSLABreachAlert as sendTeamsSLABreachAlert,
  sendApprovalNotification as sendTeamsApprovalNotification,
  sendDeliveryFailureAlert as sendTeamsDeliveryFailureAlert,
  sendSyntheticMonitorAlert as sendTeamsSyntheticMonitorAlert,
  type TeamsMessage,
  type TeamsSeverity,
  type TeamsAlertType,
} from './teams';

// SMTP domain management
export {
  setupSMTPDomain,
  verifyDomain,
  handleBounce,
  handleComplaint,
  getReputationStatus,
  getSMTPDomainConfig,
  generateDKIMKeys,
  generateDNSRecords,
  generateVerificationToken,
  type SMTPDomainConfig,
  type DNSRecords,
  type ReputationStatus,
} from '../smtp/domain-setup';
