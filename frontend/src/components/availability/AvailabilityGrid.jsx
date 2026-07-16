import { useEffect, useState } from "react";
import { DAYS, HOURS } from "../../constants";
import { api } from "../../services/api";
import { buildWeekDays, formatWeekRangeLabel, weekStartString } from "../../utils/date";
import { parseOwnerQuery } from "../../utils/owner";

function FragmentRow({ hour, activeSlots, toggleSlot, readOnly, selectedDayIndex }) {
  return (
    <>
      <div className="grid-time">{String(hour).padStart(2, "0")}:00</div>
      {DAYS.map((_, dayOfWeek) => {
        const key = `${dayOfWeek}-${hour}`;
        const active = activeSlots.has(key);
        return (
          <button
            type="button"
            key={key}
            className={`slot ${active ? "active" : ""} ${selectedDayIndex === dayOfWeek ? "slot-focused" : ""}`}
            onClick={() => toggleSlot(dayOfWeek, hour)}
            disabled={readOnly}
          >
            {active ? "Open" : ""}
          </button>
        );
      })}
    </>
  );
}

export function AvailabilityGrid({ session, ownerQuery = "", readOnly = false }) {
  const [weekStart, setWeekStart] = useState(weekStartString());
  const [mode, setMode] = useState("week");
  const [activeSlots, setActiveSlots] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const weekDays = buildWeekDays(weekStart, session.user.timezone || "UTC");

  useEffect(() => {
    async function load() {
      const data = mode === "template"
        ? await api(`/api/availability/template?${ownerQuery}`, { token: session.token })
        : await api(`/api/availability/weekly?weekStart=${weekStart}&${ownerQuery}`, { token: session.token });

      const next = new Set();
      if (mode === "template") {
        (data.slots || []).forEach((slot) => next.add(`${slot.dayOfWeek}-${slot.hour}`));
      } else {
        (data.dates || []).forEach((date, dayOfWeek) => {
          (data.availability?.[date] || []).forEach((slot) => {
            const hour = new Date(slot.startTime).getUTCHours();
            next.add(`${dayOfWeek}-${hour}`);
          });
        });
      }
      setActiveSlots(next);
    }

    load().catch((error) => setMessage(error.message));
  }, [mode, ownerQuery, session.token, weekStart]);

  function toggleSlot(dayOfWeek, hour) {
    if (readOnly) return;
    const key = `${dayOfWeek}-${hour}`;
    setActiveSlots((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveChanges() {
    setSaving(true);
    setMessage("");
    try {
      const slots = [...activeSlots].map((key) => {
        const [dayOfWeek, hour] = key.split("-").map(Number);
        return { dayOfWeek, hour, enabled: true };
      });

      await api("/api/availability/batch", {
        method: "POST",
        token: session.token,
        body: mode === "template"
          ? { scope: "template", weekStart, pattern: slots, ...parseOwnerQuery(ownerQuery) }
          : {
              scope: "week",
              weekStart,
              slots: HOURS.flatMap((slotHour) =>
                DAYS.map((_, dayOfWeek) => ({
                  dayOfWeek,
                  hour: slotHour,
                  enabled: activeSlots.has(`${dayOfWeek}-${slotHour}`),
                }))
              ),
              ...parseOwnerQuery(ownerQuery),
            },
      });

      setMessage("Availability saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="row between">
        <div>
          <p className="eyebrow">Availability</p>
          <h3>{readOnly ? "Weekly snapshot" : "Set your repeating template or this week only"}</h3>
        </div>
        <div className="row">
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="template">Repeating template</option>
            <option value="week">This week only</option>
          </select>
          {!readOnly && (
            <button className="primary-schedule-button" disabled={saving} onClick={saveChanges}>
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
      {mode === "week" && (
        <div className="calendar-strip">
          <div className="calendar-strip-header">
            <div>
              <strong>{formatWeekRangeLabel(weekStart, session.user.timezone || "UTC")}</strong>
              <span>Choose the week you want to edit, then tap slots for that day.</span>
            </div>
            <label className="calendar-date-input">
              <span>Week of</span>
              <input type="date" value={weekStart} onChange={(event) => setWeekStart(weekStartString(new Date(`${event.target.value}T12:00:00`)))} />
            </label>
          </div>
          <div className="calendar-day-row">
            {weekDays.map((day, index) => (
              <button
                key={day.date}
                type="button"
                className={`calendar-day-card ${selectedDayIndex === index ? "calendar-day-card-active" : ""}`}
                onClick={() => setSelectedDayIndex(index)}
              >
                <span>{day.weekday}</span>
                <strong>{day.dayNumber}</strong>
                <small>{day.month}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid">
        <div></div>
        {DAYS.map((day) => <div key={day} className="grid-head">{day}</div>)}
        {HOURS.map((hour) => (
          <FragmentRow
            key={hour}
            hour={hour}
            activeSlots={activeSlots}
            toggleSlot={toggleSlot}
            readOnly={readOnly}
            selectedDayIndex={selectedDayIndex}
          />
        ))}
      </div>
      {message && <p className="muted">{message}</p>}
    </section>
  );
}
