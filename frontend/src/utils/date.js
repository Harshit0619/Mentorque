export function weekStartString(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  value.setHours(0, 0, 0, 0);
  return value.toISOString().slice(0, 10);
}

export function formatDateTime(dateText, hour) {
  const value = new Date(`${dateText}T00:00:00`);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
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
  const value = new Date(`${dateText}T00:00:00Z`);
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
