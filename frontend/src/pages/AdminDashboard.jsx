import { useEffect, useState } from "react";
import { CALL_TYPE_OPTIONS, HOURS, TIMEZONE_OPTIONS } from "../constants";
import { api } from "../services/api";
import { buildOverlapDays, formatDateTime, formatDayLabel, formatSlotRange, weekStartString } from "../utils/date";
import { MentorEditorDark } from "../components/admin/MentorEditorDark";

export function AdminDashboard({ session }) {
  const [users, setUsers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [timezone, setTimezone] = useState("UTC");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCallType, setSelectedCallType] = useState("RESUME_REVAMP");
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [booking, setBooking] = useState({
    title: "",
    date: "",
    startHour: "10",
    endHour: "11",
    notes: "",
    extraEmails: [""],
  });
  const [overlap, setOverlap] = useState(null);
  const [userWeek, setUserWeek] = useState(null);
  const [mentorWeek, setMentorWeek] = useState(null);
  const [status, setStatus] = useState("");
  const [mentorStatus, setMentorStatus] = useState("");

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const selectedMentor = recommendations.find((mentor) => mentor.id === selectedMentorId)
    || mentors.find((mentor) => mentor.id === selectedMentorId);
  const timezoneMeta = TIMEZONE_OPTIONS.find((option) => option.value === timezone) || TIMEZONE_OPTIONS[0];
  const overlapDays = buildOverlapDays(userWeek, mentorWeek);

  useEffect(() => {
    Promise.all([
      api("/api/admin/users", { token: session.token }),
      api("/api/admin/mentors", { token: session.token }),
    ])
      .then(([userList, mentorList]) => {
        setUsers(userList);
        setMentors(mentorList);
        if (userList[0]) setSelectedUserId(userList[0].id);
      })
      .catch((error) => setStatus(error.message));
  }, [session.token]);

  useEffect(() => {
    async function loadRecommendations() {
      if (!selectedUserId) return;
      try {
        const result = await api(`/api/admin/recommendations/${selectedUserId}?callType=${selectedCallType}`, {
          token: session.token,
        });
        setRecommendations(result.recommendations);
        setSelectedMentorId((current) => current || result.recommendations[0]?.id || "");
      } catch (error) {
        setStatus(error.message);
      }
    }

    loadRecommendations();
  }, [selectedUserId, selectedCallType, session.token]);

  useEffect(() => {
    async function loadWeeklyAvailability() {
      if (!selectedUserId || !selectedMentorId) return;
      const weekStart = weekStartString();
      try {
        const [userAvailability, mentorAvailability] = await Promise.all([
          api(`/api/availability/weekly?weekStart=${weekStart}&userId=${selectedUserId}`, { token: session.token }),
          api(`/api/availability/weekly?weekStart=${weekStart}&mentorId=${selectedMentorId}`, { token: session.token }),
        ]);
        setUserWeek(userAvailability);
        setMentorWeek(mentorAvailability);
      } catch (error) {
        setStatus(error.message);
      }
    }

    loadWeeklyAvailability();
  }, [selectedUserId, selectedMentorId, session.token]);

  async function saveMentor(mentorId, nextFields) {
    setMentorStatus("");
    try {
      await api(`/api/admin/mentors/${mentorId}`, {
        method: "PATCH",
        token: session.token,
        body: nextFields,
      });
      const refreshed = await api("/api/admin/mentors", { token: session.token });
      setMentors(refreshed);
      setMentorStatus("Mentor metadata saved.");
    } catch (error) {
      setMentorStatus(error.message);
    }
  }

  async function checkOverlap() {
    setStatus("");
    if (!selectedUserId || !selectedMentorId || !booking.date) {
      setStatus("Select a user, mentor, and date before checking overlap.");
      return;
    }
    try {
      const startTime = formatDateTime(booking.date, Number(booking.startHour));
      const endTime = formatDateTime(booking.date, Number(booking.endHour));
      const result = await api(
        `/api/admin/availability/${selectedUserId}/overlap?mentorId=${selectedMentorId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
        { token: session.token }
      );
      setOverlap(result);
      setStatus(result.overlap ? "Overlap confirmed for this slot." : "No overlap for the selected slot.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function createBooking(event) {
    event.preventDefault();
    setStatus("");
    if (!selectedUserId || !selectedMentorId || !booking.date) {
      setStatus("Select a user, mentor, and date before scheduling.");
      return;
    }
    try {
      const mentor = recommendations.find((item) => item.id === selectedMentorId) || mentors.find((item) => item.id === selectedMentorId);
      const startTime = formatDateTime(booking.date, Number(booking.startHour));
      const endTime = formatDateTime(booking.date, Number(booking.endHour));

      const result = await api("/api/admin/meetings", {
        method: "POST",
        token: session.token,
        body: {
          userId: selectedUserId,
          mentorId: selectedMentorId,
          callType: selectedCallType,
          title: booking.title || `${CALL_TYPE_OPTIONS.find((item) => item.value === selectedCallType)?.label} Session`,
          startTime,
          endTime,
          notes: booking.notes,
          recommendationReason: mentor?.recommendation?.reasons?.join(", ") || "",
          participantEmails: booking.extraEmails.map((email) => email.trim()).filter(Boolean),
        },
      });
      setStatus(`Booked ${result.title}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="dashboard admin-dashboard-dark">
      <section className="admin-main-surface">
        <div className="admin-heading">
          <div>
            <h1>Admin Dashboard</h1>
            <p>View user and mentor availability, compare overlaps, and schedule mentoring calls.</p>
          </div>
        </div>

        <div className="admin-scheduler-layout">
          <section className="admin-left">
            <div className="admin-controls">
              <label className="dark-field">
                <span>Timezone</span>
                <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="dark-field">
                <span>User</span>
                <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                  <option value="">Select user</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
              <label className="dark-field">
                <span>Mentor</span>
                <select value={selectedMentorId} onChange={(event) => setSelectedMentorId(event.target.value)}>
                  <option value="">Select mentor</option>
                  {(recommendations.length ? recommendations : mentors).map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
                  ))}
                </select>
              </label>
              <label className="dark-field">
                <span>Call Type</span>
                <select value={selectedCallType} onChange={(event) => setSelectedCallType(event.target.value)}>
                  {CALL_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <div className="admin-selection-meta">
              <span>User: {selectedUser?.email || "None selected"}</span>
              <span>Mentor: {selectedMentor?.email || "None selected"}</span>
              <span>Showing today and next 6 days ({timezoneMeta.short})</span>
            </div>

            <section className="meetings-board">
              <div className="meetings-board-header">
                <div>
                  <strong>Meetings</strong>
                  <span>Common available times for selected user and mentor</span>
                </div>
              </div>
              <div className="meeting-columns">
                {overlapDays.map((day) => {
                  const label = formatDayLabel(day.date, timezone);
                  return (
                    <article key={day.date} className="meeting-day-card">
                      <header>
                        <strong>{label.weekday}</strong>
                        <span>{label.dayMonth}</span>
                      </header>
                      <div className="meeting-slot-stack">
                        {day.commonSlots.length === 0 && <span className="empty-slot">No availability</span>}
                        {day.commonSlots.slice(0, 3).map((slot) => (
                          <button
                            type="button"
                            key={slot.startTime}
                            className="meeting-pill"
                            onClick={() => {
                              const hour = new Date(slot.startTime).getUTCHours();
                              const endHour = new Date(slot.endTime).getUTCHours();
                              setBooking((current) => ({
                                ...current,
                                date: slot.startTime.slice(0, 10),
                                startHour: String(hour),
                                endHour: String(endHour),
                              }));
                            }}
                          >
                            <strong>{CALL_TYPE_OPTIONS.find((item) => item.value === selectedCallType)?.label}</strong>
                            <span>{formatSlotRange(slot.startTime, slot.endTime, timezone, timezoneMeta.short)}</span>
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="admin-info-grid">
              <div className="dark-panel">
                <p className="eyebrow">User requirements</p>
                <h3>{selectedUser?.name || "Select a user"}</h3>
                <p className="muted-light">{selectedUser?.description || "Choose a user to view their requirement details."}</p>
                <div className="tag-row">
                  {(selectedUser?.tags || []).map((tag) => <span key={tag} className="tag-chip">{tag}</span>)}
                </div>
              </div>
              <div className="dark-panel">
                <p className="eyebrow">Recommended mentor</p>
                <h3>{selectedMentor?.name || "Select a mentor"}</h3>
                <p className="muted-light">{selectedMentor?.description || "Top mentor suggestions appear after picking the user and call type."}</p>
                <div className="tag-row">
                  {(selectedMentor?.tags || []).map((tag) => <span key={tag} className="tag-chip">{tag}</span>)}
                </div>
                {!!selectedMentor?.recommendation?.reasons?.length && (
                  <div className="recommendation-reasons">
                    {selectedMentor.recommendation.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                  </div>
                )}
              </div>
            </section>

            <section className="admin-bottom-grid">
              <div className="dark-panel">
                <p className="eyebrow">Recommendations</p>
                <h3>Ranked mentor matches</h3>
                <div className="recommendation-list">
                  {recommendations.length === 0 && <p className="muted-light">Select a user to load ranked mentor suggestions.</p>}
                  {recommendations.map((mentor) => (
                    <button
                      key={mentor.id}
                      type="button"
                      className={`recommendation-card ${selectedMentorId === mentor.id ? "recommendation-card-active" : ""}`}
                      onClick={() => setSelectedMentorId(mentor.id)}
                    >
                      <div className="recommendation-card-top">
                        <strong>{mentor.name}</strong>
                        <span>Score {mentor.recommendation.score}</span>
                      </div>
                      <p>{mentor.description}</p>
                      <div className="tag-row">
                        {(mentor.tags || []).map((tag) => <span key={tag} className="tag-chip">{tag}</span>)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="dark-panel">
                <p className="eyebrow">Mentor metadata</p>
                <h3>Admin-managed mentor profile</h3>
                {selectedMentor ? (
                  <MentorEditorDark mentor={selectedMentor} onSave={saveMentor} />
                ) : (
                  <p className="muted-light">Choose a mentor to edit tags and description.</p>
                )}
                {mentorStatus && <p className="muted-light">{mentorStatus}</p>}
              </div>
            </section>
          </section>

          <aside className="schedule-sidebar">
            <form className="schedule-card" onSubmit={createBooking}>
              <h2>Schedule Meeting</h2>
              <label className="dark-field">
                <span>Admin email</span>
                <input value={session.user.email} readOnly />
              </label>
              <label className="dark-field">
                <span>User email</span>
                <input value={selectedUser?.email || ""} readOnly />
              </label>
              <label className="dark-field">
                <span>Mentor email</span>
                <input value={selectedMentor?.email || ""} readOnly />
              </label>
              <div className="dark-field">
                <span>Additional emails</span>
                <div className="extra-email-stack">
                  {booking.extraEmails.map((email, index) => (
                    <div key={index} className="extra-email-row">
                      <input
                        value={email}
                        onChange={(event) =>
                          setBooking((current) => ({
                            ...current,
                            extraEmails: current.extraEmails.map((item, itemIndex) => itemIndex === index ? event.target.value : item),
                          }))
                        }
                        placeholder="email@example.com"
                      />
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setBooking((current) => {
                            const nextEmails = current.extraEmails.filter((_, itemIndex) => itemIndex !== index);
                            return {
                              ...current,
                              extraEmails: nextEmails.length ? nextEmails : [""],
                            };
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setBooking((current) => ({ ...current, extraEmails: [...current.extraEmails, ""] }))}
                  >
                    + Add email
                  </button>
                </div>
              </div>
              <label className="dark-field">
                <span>Meeting name</span>
                <input value={booking.title} onChange={(event) => setBooking({ ...booking, title: event.target.value })} placeholder="Meeting title" />
              </label>
              <label className="dark-field">
                <span>Date</span>
                <input type="date" value={booking.date} onChange={(event) => setBooking({ ...booking, date: event.target.value })} />
              </label>
              <div className="time-grid">
                <label className="dark-field">
                  <span>Start time</span>
                  <select value={booking.startHour} onChange={(event) => setBooking({ ...booking, startHour: event.target.value })}>
                    {HOURS.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
                  </select>
                </label>
                <label className="dark-field">
                  <span>End time</span>
                  <select value={booking.endHour} onChange={(event) => setBooking({ ...booking, endHour: event.target.value })}>
                    {HOURS.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
                  </select>
                </label>
              </div>
              <label className="dark-field">
                <span>Timezone</span>
                <input value={timezoneMeta.label} readOnly />
              </label>
              <label className="dark-field">
                <span>Notes</span>
                <textarea rows={3} value={booking.notes} onChange={(event) => setBooking({ ...booking, notes: event.target.value })} />
              </label>
              <div className="schedule-actions">
                <button type="button" className="ghost-button" onClick={checkOverlap}>Check overlap</button>
                <button type="submit" className="primary-schedule-button">Schedule Meeting</button>
              </div>
              {overlap && <p className={`muted-light ${overlap.overlap ? "success" : "error"}`}>{overlap.overlap ? "Selected slot is available for both sides." : "This slot does not overlap for both sides."}</p>}
              {status && <p className="muted-light">{status}</p>}
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}
