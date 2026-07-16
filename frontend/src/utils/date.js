export function weekStartString(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export function addDays(dateText, daysToAdd) {
  const value = new Date(`${dateText}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + daysToAdd);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export function formatWeekRangeLabel(weekStart, timezone = "UTC") {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function buildWeekDays(weekStart, timezone = "UTC") {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const value = new Date(`${date}T12:00:00Z`);
    return {
      date,
      weekday: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short" }).format(value),
      dayNumber: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "2-digit" }).format(value),
      month: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, month: "short" }).format(value),
    };
  });
}

const TIMEZONE_OFFSETS = {
  UTC: 0,
  "Asia/Kolkata": 330,
};

function getTimezoneOffsetMinutes(timezone) {
  return TIMEZONE_OFFSETS[timezone] ?? 0;
}

export function formatDateTime(dateText, hour, timezone = "UTC") {
  const [year, month, day] = String(dateText).split("-").map(Number);
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const utcTimestamp = Date.UTC(year, month - 1, day, hour, 0, 0) - (offsetMinutes * 60 * 1000);
  return new Date(utcTimestamp).toISOString();
}

export function slotToFormValues(startIso, endIso, timezone = "UTC") {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const start = new Date(new Date(startIso).getTime() + (offsetMinutes * 60 * 1000));
  const end = new Date(new Date(endIso).getTime() + (offsetMinutes * 60 * 1000));

  return {
    date: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`,
    startHour: String(start.getUTCHours()),
    endHour: String(end.getUTCHours()),
  };
}

export function formatSlotRange(startIso, endIso, timezone, shortLabel) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${formatter.format(start)} - ${formatter.format(end)} ${shortLabel}`;
}

export function formatDayLabel(dateText, timezone) {
  const value = new Date(`${dateText}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short" }).format(value),
    dayMonth: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "2-digit", month: "short" }).format(value),
  };
}

export function buildOverlapDays(userAvailability, mentorAvailability) {
  const dates = userAvailability?.dates || mentorAvailability?.dates || [];
  return dates.map((date) => {
    const userSlots = userAvailability?.availability?.[date] || [];
    const mentorSlots = mentorAvailability?.availability?.[date] || [];
    const mentorKeys = new Set(mentorSlots.map((slot) => `${slot.startTime}|${slot.endTime}`));
    const commonSlots = userSlots.filter((slot) => mentorKeys.has(`${slot.startTime}|${slot.endTime}`));
    return { date, commonSlots };
  });
}
