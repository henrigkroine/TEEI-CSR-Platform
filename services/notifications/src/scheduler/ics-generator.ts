/**
 * ICS (iCalendar) file generator for calendar invites
 * RFC 5545 compliant
 */

export interface ICSEvent {
  summary: string;
  description?: string;
  start: Date;
  end?: Date;
  duration?: number; // minutes
  location?: string;
  url?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name?: string;
    email: string;
    role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT';
    rsvp?: boolean;
  }>;
  alarm?: {
    trigger: number; // minutes before event
    description?: string;
  };
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  sequence?: number;
  uid?: string;
}

/**
 * Format date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generate unique UID for event
 */
function generateUID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}@teei.io`;
}

/**
 * Escape special characters in ICS text
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold long lines (max 75 chars per line as per RFC 5545)
 */
function foldLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }

  const lines: string[] = [];
  let currentLine = line.substring(0, 75);
  let remaining = line.substring(75);

  lines.push(currentLine);

  while (remaining.length > 0) {
    currentLine = ' ' + remaining.substring(0, 74);
    remaining = remaining.substring(74);
    lines.push(currentLine);
  }

  return lines.join('\r\n');
}

/**
 * Generate ICS file content
 */
export function generateICS(event: ICSEvent): string {
  const lines: string[] = [];

  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//TEEI//Corporate Cockpit//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:REQUEST');

  // Event
  lines.push('BEGIN:VEVENT');

  // UID
  const uid = event.uid || generateUID();
  lines.push(`UID:${uid}`);

  // Timestamps
  const now = new Date();
  lines.push(`DTSTAMP:${formatICSDate(now)}`);
  lines.push(`CREATED:${formatICSDate(now)}`);

  // Start time
  lines.push(`DTSTART:${formatICSDate(event.start)}`);

  // End time or duration
  if (event.end) {
    lines.push(`DTEND:${formatICSDate(event.end)}`);
  } else if (event.duration) {
    const endTime = new Date(event.start.getTime() + event.duration * 60 * 1000);
    lines.push(`DTEND:${formatICSDate(endTime)}`);
  }

  // Summary (title)
  lines.push(foldLine(`SUMMARY:${escapeICSText(event.summary)}`));

  // Description
  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.description)}`));
  }

  // Location
  if (event.location) {
    lines.push(foldLine(`LOCATION:${escapeICSText(event.location)}`));
  }

  // URL
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  // Status
  lines.push(`STATUS:${event.status || 'CONFIRMED'}`);

  // Sequence
  lines.push(`SEQUENCE:${event.sequence || 0}`);

  // Organizer
  if (event.organizer) {
    const organizerName = event.organizer.name ? `CN=${escapeICSText(event.organizer.name)}:` : '';
    lines.push(`ORGANIZER;${organizerName}mailto:${event.organizer.email}`);
  }

  // Attendees
  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      const parts: string[] = [];
      if (attendee.name) {
        parts.push(`CN=${escapeICSText(attendee.name)}`);
      }
      parts.push(`ROLE=${attendee.role || 'REQ-PARTICIPANT'}`);
      parts.push(`PARTSTAT=NEEDS-ACTION`);
      parts.push(`RSVP=${attendee.rsvp !== false ? 'TRUE' : 'FALSE'}`);
      lines.push(foldLine(`ATTENDEE;${parts.join(';')}:mailto:${attendee.email}`));
    }
  }

  // Alarm (reminder)
  if (event.alarm) {
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.alarm.description || 'Reminder')}`));
    lines.push(`TRIGGER:-PT${event.alarm.trigger}M`);
    lines.push('END:VALARM');
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate ICS for board pack review meeting
 */
export function generateBoardPackICS(options: {
  companyName: string;
  reviewDate: Date;
  duration?: number;
  recipients: string[];
  organizerEmail: string;
  organizerName?: string;
  location?: string;
  timezone?: string;
}): string {
  const {
    companyName,
    reviewDate,
    duration = 60,
    recipients,
    organizerEmail,
    organizerName = 'Corporate Cockpit',
    location = 'Virtual',
    timezone = 'UTC',
  } = options;

  return generateICS({
    summary: `Board Pack Review - ${companyName}`,
    description: `Quarterly board pack review meeting for ${companyName}.\n\nAttached materials include:\n- Financial reports\n- Impact metrics\n- Strategic initiatives update\n\nPlease review materials before the meeting.`,
    start: reviewDate,
    duration,
    location,
    organizer: {
      name: organizerName,
      email: organizerEmail,
    },
    attendees: recipients.map(email => ({
      email,
      role: 'REQ-PARTICIPANT',
      rsvp: true,
    })),
    alarm: {
      trigger: 30, // 30 minutes before
      description: 'Board Pack Review Meeting in 30 minutes',
    },
    status: 'CONFIRMED',
  });
}
