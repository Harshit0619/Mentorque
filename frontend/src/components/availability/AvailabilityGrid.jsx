import { useEffect, useState } from "react";
import { DAYS, HOURS } from "../../constants";
import { api } from "../../services/api";
import { weekStartString } from "../../utils/date";
import { parseOwnerQuery } from "../../utils/owner";

function FragmentRow({ hour, activeSlots, toggleSlot, readOnly }) {
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
            className={`slot ${active ? "active" : ""}`}
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
  const [mode, setMode] = useState("template");
  const [activeSlots, setActiveSlots] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
          <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
          {!readOnly && (
            <button disabled={saving} onClick={saveChanges}>
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
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
          />
        ))}
      </div>
      {message && <p className="muted">{message}</p>}
    </section>
  );
}
