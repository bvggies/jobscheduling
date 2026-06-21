const { BUSINESS_HOURS } = require('./shopConfig');

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SLOT_MINUTES = 30;

function parseTimeOnDate(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTimeHHMM(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function getDayHours(date) {
  const key = DAY_KEYS[date.getDay()];
  return BUSINESS_HOURS[key] || null;
}

function isDuringBreak(slotStart, slotEnd) {
  const br = BUSINESS_HOURS.break;
  if (!br) return false;
  const breakStart = parseTimeOnDate(slotStart, br.start);
  const breakEnd = parseTimeOnDate(slotStart, br.end);
  return slotStart < breakEnd && slotEnd > breakStart;
}

/**
 * Generate bookable appointment slots for the next `daysAhead` calendar days.
 */
function generateSlotCandidates(daysAhead = 14, fromDate = new Date()) {
  const slots = [];
  const startDay = new Date(fromDate);
  startDay.setHours(0, 0, 0, 0);

  for (let d = 0; d < daysAhead; d += 1) {
    const day = new Date(startDay);
    day.setDate(startDay.getDate() + d);
    const hours = getDayHours(day);
    if (!hours) continue;

    const open = parseTimeOnDate(day, hours.open);
    const close = parseTimeOnDate(day, hours.close);
    let cursor = new Date(open);

    while (cursor < close) {
      const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000);
      if (slotEnd > close) break;
      if (!isDuringBreak(cursor, slotEnd) && cursor > fromDate) {
        slots.push({
          date: formatDateISO(cursor),
          time: formatTimeHHMM(cursor),
          datetime: cursor.toISOString(),
          label: `${formatDateISO(cursor)} at ${formatTimeHHMM(cursor)}`,
        });
      }
      cursor = slotEnd;
    }
  }
  return slots;
}

function slotKey(dateStr, timeStr) {
  return `${dateStr}|${timeStr}`;
}

/**
 * Filter out slots already booked (due_date + due_time on active jobs).
 */
async function getAvailableSlots(db, { daysAhead = 14, fromDate = new Date() } = {}) {
  const candidates = generateSlotCandidates(daysAhead, fromDate);
  if (candidates.length === 0) return [];

  const minDate = candidates[0].date;
  const maxDate = candidates[candidates.length - 1].date;

  const booked = await db.query(
    `
    SELECT due_date::text AS due_date, due_time::text AS due_time
    FROM jobs
    WHERE status != 'Completed'
    AND due_date IS NOT NULL
    AND due_time IS NOT NULL
    AND due_date >= $1::date
    AND due_date <= $2::date
  `,
    [minDate, maxDate]
  );

  const taken = new Set(
    booked.rows.map((r) => {
      const t = String(r.due_time).slice(0, 5);
      return slotKey(r.due_date, t);
    })
  );

  return candidates.filter((s) => !taken.has(slotKey(s.date, s.time)));
}

function isValidBookableSlot(dateStr, timeStr, fromDate = new Date()) {
  if (!dateStr || !timeStr) return false;
  const timeNorm = String(timeStr).slice(0, 5);
  const day = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(day.getTime())) return false;

  const hours = getDayHours(day);
  if (!hours) return false;

  const slotStart = parseTimeOnDate(day, timeNorm);
  const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60 * 1000);
  const open = parseTimeOnDate(day, hours.open);
  const close = parseTimeOnDate(day, hours.close);

  if (slotStart <= fromDate) return false;
  if (slotStart < open || slotEnd > close) return false;
  if (isDuringBreak(slotStart, slotEnd)) return false;
  return true;
}

module.exports = {
  generateSlotCandidates,
  getAvailableSlots,
  isValidBookableSlot,
  slotKey,
  SLOT_MINUTES,
};
