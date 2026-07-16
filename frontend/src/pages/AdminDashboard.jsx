import { useEffect, useState } from "react";
import { CALL_TYPE_OPTIONS, HOURS, TIMEZONE_OPTIONS } from "../constants";
import { api } from "../services/api";
import { buildOverlapDays, buildWeekDays, formatDateTime, formatDayLabel, formatSlotRange, formatWeekRangeLabel, slotToFormValues, weekStartString } from "../utils/date";
import { MentorEditorDark } from "../components/admin/MentorEditorDark";
import { useMeetings } from "../hooks/useMeetings";
import { DarkMeetingsView } from "../components/shared/DarkMeetingsView";

export function AdminDashboard({ session }) {
  const [users, setUsers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [timezone, setTimezone] = useState("UTC");
  const [workspaceTab, setWorkspaceTab] = useState("availability");
  const [weekStart, setWeekStart] = useState(weekStartString());
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
  const [selectedCommonSlot, setSelectedCommonSlot] = useState(null);
  const [userWeek, setUserWeek] = useState(null);
  const [mentorWeek, setMentorWeek] = useState(null);
  const [status, setStatus] = useState("");
  const [mentorStatus, setMentorStatus] = useState("");
  const [checkingOverlap, setCheckingOverlap] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const { meetings, reloadMeetings } = useMeetings(session.token, session.user);

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const selectedMentor = recommendations.find((mentor) => mentor.id === selectedMentorId)
    || mentors.find((mentor) => mentor.id === selectedMentorId);
  const timezoneMeta = TIMEZONE_OPTIONS.find((option) => option.value === timezone) || TIMEZONE_OPTIONS[0];
  const overlapDays = buildOverlapDays(userWeek, mentorWeek);
  const weekDays = buildWeekDays(weekStart, timezone);
  const selectedBookingDate = booking.date || weekStart;
  const selectedDayRow = selectedBookingDate;

  useEffect(() => {
    setSelectedCommonSlot(null);
    setOverlap(null);
  }, [selectedUserId, selectedMentorId, selectedCallType, timezone]);

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
  }, [selectedUserId, selectedMentorId, session.token, weekStart]);

  useEffect(() => {
    const firstAvailableSlot = overlapDays.flatMap((day) => day.commonSlots).find(Boolean);
    if (!firstAvailableSlot) return;

    const nextBookingValues = slotToFormValues(firstAvailableSlot.startTime, firstAvailableSlot.endTime, timezone);
    setBooking((current) => {
      if (current.date && current.startHour && current.endHour && selectedCommonSlot) {
        return current;
      }
      return {
        ...current,
        ...nextBookingValues,
      };
    });
  }, [overlapDays, timezone, selectedCommonSlot]);

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
    setCheckingOverlap(true);
    try {
      const startTime = formatDateTime(booking.date, Number(booking.startHour), timezone);
      const endTime = formatDateTime(booking.date, Number(booking.endHour), timezone);
      const result = await api(
        `/api/admin/availability/${selectedUserId}/overlap?mentorId=${selectedMentorId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
        { token: session.token }
      );
      setOverlap(result);
      setStatus(result.overlap ? "Overlap confirmed for this slot." : "No overlap for the selected slot.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setCheckingOverlap(false);
    }
  }

  async function createBooking(event) {
    event.preventDefault();
    setStatus("");
    if (!selectedUserId || !selectedMentorId || !booking.date) {
      setStatus("Select a user, mentor, and date before scheduling.");
      return;
    }
    if (Number(booking.endHour) <= Number(booking.startHour)) {
      setStatus("End time must be later than start time.");
      return;
    }
    setScheduling(true);
    try {
      const startTime = formatDateTime(booking.date, Number(booking.startHour), timezone);
      const endTime = formatDateTime(booking.date, Number(booking.endHour), timezone);
      const mentor = recommendations.find((item) => item.id === selectedMentorId) || mentors.find((item) => item.id === selectedMentorId);

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
      setOverlap({ overlap: true, userAvailable: true, mentorAvailable: true });
      setStatus(`Booked ${result.title}.`);
      reloadMeetings();
    } catch (error) {
      setStatus(error.message);
      if (error.message === "Selected slot is not available for both participants") {
        setOverlap({ overlap: false, userAvailable: false, mentorAvailable: false });
      }
    } finally {
      setScheduling(false);
    }
  }

  async function deleteMeeting(meetingId) {
    await api(`/api/meetings/${meetingId}`, {
      method: "DELETE",
      token: session.token,
    });
    reloadMeetings();
    setStatus("Meeting deleted.");
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
                  {users.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
                </select>
              </label>
              <label className="dark-field">
                <span>Mentor</span>
                <select value={selectedMentorId} onChange={(event) => setSelectedMentorId(event.target.value)}>
                  <option value="">Select mentor</option>
                  {(recommendations.length ? recommendations : mentors).map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>{mentor.email}</option>
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
            <div className="tab-header">
              <div className="tab-group">
                <button type="button" className={`tab-pill ${workspaceTab === "availability" ? "tab-pill-active" : ""}`} onClick={() => setWorkspaceTab("availability")}>
                  Availability
                </button>
                <button type="button" className={`tab-pill ${workspaceTab === "scheduled" ? "tab-pill-active" : ""}`} onClick={() => setWorkspaceTab("scheduled")}>
                  Scheduled meetings
                </button>
              </div>
            </div>

            {workspaceTab === "availability" && (
              <>
                <section className="meetings-board">
                  <div className="meetings-board-header">
                    <div>
                      <strong>Common times</strong>
                      <span>Availability loaded for the selected user and mentor across the selected week</span>
                    </div>
                  </div>
                  <div className="calendar-strip calendar-strip-admin">
                    <div className="calendar-strip-header">
                      <div>
                        <strong>{formatWeekRangeLabel(weekStart, timezone)}</strong>
                        <span>Pick a week, then choose a day card to focus matching slots faster.</span>
                      </div>
                      <label className="calendar-date-input">
                        <span>Week of</span>
                        <input type="date" value={weekStart} onChange={(event) => setWeekStart(weekStartString(new Date(`${event.target.value}T12:00:00`)))} />
                      </label>
                    </div>
                    <div className="calendar-day-row">
                      {weekDays.map((day) => (
                        <button
                          key={day.date}
                          type="button"
                          className={`calendar-day-card ${selectedBookingDate === day.date ? "calendar-day-card-active" : ""}`}
                          onClick={() => {
                            setBooking((current) => ({ ...current, date: day.date }));
                            setSelectedCommonSlot(null);
                            setOverlap(null);
                          }}
                        >
                          <span>{day.weekday}</span>
                          <strong>{day.dayNumber}</strong>
                          <small>{day.month}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="availability-table-header">
                    <span>Date</span>
                    <span>User availability</span>
                    <span>Mentor availability</span>
                    <span>Common times</span>
                  </div>
                  <div className="availability-table">
                    {overlapDays.map((day) => {
                      const label = formatDayLabel(day.date, timezone);
                      const userCount = userWeek?.availability?.[day.date]?.length || 0;
                      const mentorCount = mentorWeek?.availability?.[day.date]?.length || 0;
                      return (
                        <article key={day.date} className={`availability-row ${selectedDayRow === day.date ? "availability-row-active" : ""}`}>
                          <div className="availability-row-date">
                            <strong>{label.weekday}</strong>
                            <span>{label.dayMonth}</span>
                          </div>
                          <div className="availability-row-meta">{userCount ? `${userCount} slots` : "No availability"}</div>
                          <div className="availability-row-meta">{mentorCount ? `${mentorCount} slots` : "No availability"}</div>
                          <div className="meeting-slot-stack">
                            {day.commonSlots.length === 0 && <span className="empty-slot">No availability</span>}
                            {day.commonSlots.slice(0, 3).map((slot) => (
                              <button
                                type="button"
                                key={slot.startTime}
                                className="meeting-pill"
                                onClick={() => {
                                  const formValues = slotToFormValues(slot.startTime, slot.endTime, timezone);
                                setBooking((current) => ({
                                  ...current,
                                  ...formValues,
                                }));
                                setSelectedCommonSlot(slot.startTime);
                                setOverlap({ overlap: true, userAvailable: true, mentorAvailable: true });
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
              </>
            )}

            {workspaceTab === "scheduled" && (
              <DarkMeetingsView meetings={meetings} canDelete onDelete={deleteMeeting} emptyTitle="No scheduled meetings yet" emptyBody="Booked events will appear here in separate tabs." />
            )}

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
                <button type="button" className="ghost-button" onClick={checkOverlap} disabled={checkingOverlap || scheduling}>
                  {checkingOverlap ? "Checking..." : "Check overlap"}
                </button>
                <button type="submit" className="primary-schedule-button" disabled={scheduling || !selectedUserId || !selectedMentorId || !booking.date}>
                  {scheduling ? "Scheduling..." : "Schedule Meeting"}
                </button>
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
