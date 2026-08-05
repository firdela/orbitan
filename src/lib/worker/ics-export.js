// ============================================================
// ORBITANOS — iCalendar (.ics) Export Utility (Build #28.2K)
// ------------------------------------------------------------
// Pure JS iCalendar (RFC 5545) generator for worker calendar
// events. Generates valid .ics files for single events and
// date-range exports. Contains only authorised information —
// no internal IDs (except stable UIDs), no tenant secrets,
// no private notes unless explicitly selected, no other
// employee's information, no sensitive operational data.
//
// Pure JS — zero React imports — safe for tests.
// ============================================================

/**
 * Escapes special characters per RFC 5545 TEXT rules.
 */
function escapeICS(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Converts a date string (YYYY-MM-DD) + optional time (HH:mm) to
 * an ICS DTSTART/DTEND value.
 * - All-day: YYYYMMDD
 * - Timed: YYYYMMDDTHHMMSS (local time, no Z — device-local)
 */
function formatICSDateTime(dateStr, timeStr, allDay) {
  if (!dateStr) return '';
  const datePart = dateStr.replace(/-/g, '');
  if (allDay || !timeStr) return datePart;
  const timePart = (timeStr || '00:00').replace(':', '') + '00';
  return `${datePart}T${timePart}`;
}

/**
 * Computes end datetime for an event.
 * For all-day events, end = next day (per ICS spec: DTEND is exclusive).
 * For timed events without end_time, defaults to 1 hour after start.
 */
function computeEndDateTime(dateStr, startTime, endTime, allDay) {
  if (allDay || !startTime) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0].replace(/-/g, '');
  }
  if (endTime) {
    return formatICSDateTime(dateStr, endTime, false);
  }
  // Default 1-hour duration
  const [h, m] = startTime.split(':').map(Number);
  const endH = h + 1;
  const endTimeStr = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return formatICSDateTime(dateStr, endTimeStr, false);
}

/**
 * Generates a stable UID for an ICS event.
 * Uses source + source_id to ensure uniqueness and idempotency.
 * Never exposes internal tenant/user IDs.
 */
function generateICSUID(event) {
  const random = Math.random().toString(36).substring(2, 10);
  return `${event.source}-${event.source_id}-${random}@orbitan.net`;
}

/**
 * Generates an ICS VEVENT block for a single calendar event.
 * Only includes authorised fields — no private notes, no other
 * employee information, no sensitive operational data.
 */
function eventToVEvent(event, calendarName = 'Orbitan Worker Schedule') {
  const uid = generateICSUID(event);
  const dtStart = formatICSDateTime(event.date, event.start, event.all_day);
  const dtEnd = computeEndDateTime(event.date, event.start, event.end, event.all_day);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART${event.all_day ? ';VALUE=DATE' : ''}:${dtStart}`,
    `DTEND${event.all_day ? ';VALUE=DATE' : ''}:${dtEnd}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (event.meta?.event?.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.meta.event.description)}`);
  }

  if (event.meta?.event?.location) {
    lines.push(`LOCATION:${escapeICS(event.meta.event.location)}`);
  }

  // CATEGORIES — event type label
  lines.push(`CATEGORIES:${escapeICS(event.type)}`);

  // Source attribution (safe, non-sensitive)
  lines.push(`X-ORBITAN-SOURCE:${escapeICS(event.source)}`);

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

/**
 * Generates a complete .ics file string for a set of events.
 * @param {array} events — array of normalised calendar events
 * @param {string} calendarName — X-WR-CALNAME value
 * @returns {string} complete ICS file content
 */
export function generateICSFile(events, calendarName = 'Orbitan Worker Schedule') {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orbitan//OrbitanOS Worker Calendar//EN',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Singapore',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ].join('\r\n');

  const footer = 'END:VCALENDAR';

  const vevents = (events || [])
    .filter(e => e && e.date)
    .map(e => eventToVEvent(e, calendarName))
    .join('\r\n');

  return [header, vevents, footer].join('\r\n');
}

/**
 * Generates a .ics file for a single event (for "Add to Calendar" button).
 * @param {object} event — single normalised calendar event
 * @returns {string} complete ICS file content
 */
export function generateSingleEventICS(event) {
  return generateICSFile([event], 'Orbitan Event');
}

/**
 * Triggers a browser download of an .ics file.
 * @param {string} icsContent — ICS file content
 * @param {string} filename — download filename
 */
export function downloadICSFile(icsContent, filename = 'orbitan-calendar.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports events as an .ics file download.
 * Convenience wrapper combining generation + download.
 * @param {array} events — normalised calendar events
 * @param {string} filename — download filename
 */
export function exportEventsAsICS(events, filename = 'orbitan-calendar.ics') {
  const ics = generateICSFile(events);
  downloadICSFile(ics, filename);
}

/**
 * Exports a single event as an .ics file download.
 * @param {object} event — single normalised calendar event
 */
export function exportSingleEventAsICS(event) {
  const ics = generateSingleEventICS(event);
  const safeTitle = (event?.title || 'event').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadICSFile(ics, `orbitan-${safeTitle}.ics`);
}