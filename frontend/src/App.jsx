import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STORAGE_KEY = "mentorque-session";
const HOURS = Array.from({ length: 12 }, (_, index) => index + 8);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "GMT (GMT+0)", short: "GMT" },
  { value: "Asia/Kolkata", label: "IST (GMT+5:30)", short: "IST" },
];
const CALL_TYPE_OPTIONS = [
  { value: "RESUME_REVAMP", label: "Resume Revamp" },
  { value: "JOB_MARKET_GUIDANCE", label: "Job Market Guidance" },
  { value: "MOCK_INTERVIEW", label: "Mock Interviews" },
];

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

async function api(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Request failed");
  }
  return payload;
}

function weekStartString(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  value.setHours(0, 0, 0, 0);
  return value.toISOString().slice(0, 10);
}

function formatDateTime(dateText, hour) {
  const value = new Date(`${dateText}T00:00:00`);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}

function formatSlotRange(startIso, endIso, timezone, shortLabel) {
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

function formatDayLabel(dateText, timezone) {
  const value = new Date(`${dateText}T00:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short" }).format(value),
    dayMonth: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "2-digit", month: "short" }).format(value),
  };
}

function buildOverlapDays(userAvailability, mentorAvailability) {
  const dates = userAvailability?.dates || mentorAvailability?.dates || [];
  return dates.map((date) => {
    const userSlots = userAvailability?.availability?.[date] || [];
    const mentorSlots = mentorAvailability?.availability?.[date] || [];
    const mentorKeys = new Set(mentorSlots.map((slot) => `${slot.startTime}|${slot.endTime}`));
    const commonSlots = userSlots.filter((slot) => mentorKeys.has(`${slot.startTime}|${slot.endTime}`));
    return { date, commonSlots };
  });
}

function useAuth() {
  const [session, setSession] = useState(readSession);

  const saveSession = (next) => {
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const clearSession = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { session, saveSession, clearSession };
}

function Shell({ children, session, onLogout }) {
  const location = useLocation();
  const isAdminTheme = session?.user?.role === "ADMIN" && location.pathname === "/dashboard";
  return (
    <div className={`app-shell ${isAdminTheme ? "admin-shell" : ""}`}>
      <header className={`topbar ${isAdminTheme ? "topbar-dark" : ""}`}>
        <Link className="brand" to="/">
          Mentorque Scheduler
        </Link>
        <nav className={`topnav ${isAdminTheme ? "topnav-dark" : ""}`}>
          {!session && <Link to="/">Home</Link>}
          {session && <span>{session.user.name} | {session.user.role}</span>}
          {session && location.pathname !== "/" && <button onClick={onLogout}>Logout</button>}
        </nav>
      </header>
      {children}
    </div>
  );
}

function Landing() {
  return (
    <main className="hero">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Assignment-ready scheduling flow</p>
          <h1>Mentor scheduling with a cleaner admin-first booking experience.</h1>
          <p className="lede">
            Inspired by the calm scheduling polish of Cal.com and Acuity, this flow keeps users and mentors focused on
            availability while admins handle matching, overlap validation, and final booking.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" to="/login/admin">Open admin portal</Link>
            <Link className="secondary-link" to="/login/user">Try user flow</Link>
          </div>
        </div>
        <div className="hero-preview panel">
          <div className="preview-header">
            <strong>Scheduling overview</strong>
            <span>This week</span>
          </div>
          <div className="preview-stack">
            <div className="preview-card">
              <span>Requirements captured</span>
              <strong>10 users ready for matching</strong>
            </div>
            <div className="preview-card">
              <span>Mentor intelligence</span>
              <strong>5 mentor profiles with tags and descriptions</strong>
            </div>
            <div className="preview-card">
              <span>Admin workflow</span>
              <strong>Recommend, verify overlap, book</strong>
            </div>
          </div>
        </div>
      </section>
      <section className="role-grid">
        <RoleCard title="User Portal" description="Update requirements and availability." to="/login/user" />
        <RoleCard title="Mentor Portal" description="Manage availability only." to="/login/mentor" />
        <RoleCard title="Admin Portal" description="Match, verify, and schedule calls." to="/login/admin" />
      </section>
    </main>
  );
}

function RoleCard({ title, description, to }) {
  return (
    <Link className="role-card" to={to}>
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
  );
}

function LoginPage({ role, onLogin, session }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(role === "ADMIN" ? "admin@mentorque.com" : "");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.role === role) {
      navigate("/dashboard");
    }
  }, [navigate, role, session]);

  const title = {
    USER: "User login",
    MENTOR: "Mentor login",
    ADMIN: "Admin login",
  }[role];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: { email, password, role },
      });
      onLogin(result);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="panel-wrap">
      <form className="panel" onSubmit={handleSubmit}>
        <p className="eyebrow">{title}</p>
        <h2>Use the seeded credentials to explore the role-specific flow.</h2>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}

function AvailabilityGrid({ session, ownerQuery = "", readOnly = false }) {
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
              slots: HOURS.flatMap((hour) =>
                DAYS.map((_, dayOfWeek) => ({
                  dayOfWeek,
                  hour,
                  enabled: activeSlots.has(`${dayOfWeek}-${hour}`),
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

function MeetingsPanel({ session }) {
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    api("/api/meetings", { token: session.token }).then(setMeetings).catch(() => setMeetings([]));
  }, [session.token]);

  return (
    <section className="panel">
      <p className="eyebrow">Scheduled calls</p>
      <h3>Your upcoming meetings</h3>
      <div className="stack">
        {meetings.length === 0 && <p className="muted">No meetings yet.</p>}
        {meetings.map((meeting) => (
          <article key={meeting.id} className="list-card">
            <strong>{meeting.title}</strong>
            <span>{new Date(meeting.startTime).toLocaleString()} - {new Date(meeting.endTime).toLocaleTimeString()}</span>
            <span>{meeting.callType?.replaceAll("_", " ")}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatsStrip({ items }) {
  return (
    <section className="stats-strip">
      {items.map((item) => (
        <article key={item.label} className="stat-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.helper && <small>{item.helper}</small>}
        </article>
      ))}
    </section>
  );
}

function UserDashboard({ session, refreshSession }) {
  const [form, setForm] = useState({
    name: session.user.name,
    timezone: session.user.timezone,
    description: session.user.description || "",
    tags: Array.isArray(session.user.tags) ? session.user.tags.join(", ") : "",
  });
  const [message, setMessage] = useState("");

  async function saveProfile(event) {
    event.preventDefault();
    setMessage("");
    const result = await api("/api/auth/profile", {
      method: "PATCH",
      token: session.token,
      body: {
        ...form,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      },
    });
    refreshSession({ ...session, user: result.user });
    setMessage("Requirements updated.");
  }

  return (
    <main className="dashboard">
      <StatsStrip
        items={[
          { label: "Role", value: "User", helper: "Can edit requirements and availability" },
          { label: "Tags", value: Array.isArray(session.user.tags) ? session.user.tags.length : 0, helper: "Used for mentor matching" },
          { label: "Booking", value: "Admin-led", helper: "Users cannot book directly" },
        ]}
      />
      <form className="panel" onSubmit={saveProfile}>
        <p className="eyebrow">User requirements</p>
        <h2>Describe what kind of help you need before admin starts matching.</h2>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Timezone<input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label>
        <label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="tech, good_communication" /></label>
        <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} /></label>
        <button type="submit">Save requirements</button>
        {message && <p className="muted">{message}</p>}
      </form>
      <AvailabilityGrid session={session} />
      <MeetingsPanel session={session} />
    </main>
  );
}

function MentorDashboard({ session }) {
  return (
    <main className="dashboard">
      <StatsStrip
        items={[
          { label: "Role", value: "Mentor", helper: "Can edit availability only" },
          { label: "Metadata", value: "Admin managed", helper: "Tags and description stay consistent" },
          { label: "Booking", value: "Admin-led", helper: "Calls are scheduled by admin" },
        ]}
      />
      <section className="panel">
        <p className="eyebrow">Mentor availability</p>
        <h2>Mentors only manage availability in this flow.</h2>
        <p className="muted">Mentor tags and descriptions stay under admin control so recommendations remain consistent.</p>
      </section>
      <AvailabilityGrid session={session} />
      <MeetingsPanel session={session} />
    </main>
  );
}

function AdminDashboard({ session }) {
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
    await api(`/api/admin/mentors/${mentorId}`, {
      method: "PATCH",
      token: session.token,
      body: nextFields,
    });
    const refreshed = await api("/api/admin/mentors", { token: session.token });
    setMentors(refreshed);
    setStatus("Mentor metadata saved.");
  }

  async function checkOverlap() {
    if (!selectedUserId || !selectedMentorId || !booking.date) return;
    const startTime = formatDateTime(booking.date, Number(booking.startHour));
    const endTime = formatDateTime(booking.date, Number(booking.endHour));
    const result = await api(
      `/api/admin/availability/${selectedUserId}/overlap?mentorId=${selectedMentorId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
      { token: session.token }
    );
    setOverlap(result);
  }

  async function createBooking(event) {
    event.preventDefault();
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
                          setBooking((current) => ({
                            ...current,
                            extraEmails: current.extraEmails.filter((_, itemIndex) => itemIndex !== index).length
                              ? current.extraEmails.filter((_, itemIndex) => itemIndex !== index)
                              : [""],
                          }))
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

function MentorEditor({ mentor, onSave }) {
  const [form, setForm] = useState({
    name: mentor.name,
    timezone: mentor.timezone,
    description: mentor.description || "",
    tags: Array.isArray(mentor.tags) ? mentor.tags.join(", ") : "",
  });

  return (
    <article className="list-card">
      <strong>{mentor.name}</strong>
      <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="tech, big_tech" />
      <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <button
        type="button"
        onClick={() =>
          onSave(mentor.id, {
            ...form,
            tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          })
        }
      >
        Save mentor
      </button>
    </article>
  );
}

function parseOwnerQuery(ownerQuery) {
  const search = new URLSearchParams(ownerQuery);
  const userId = search.get("userId");
  const mentorId = search.get("mentorId");
  return {
    ...(userId ? { userId } : {}),
    ...(mentorId ? { mentorId } : {}),
  };
}

function ProtectedDashboard({ session, refreshSession }) {
  if (!session) return <Navigate to="/" replace />;
  if (session.user.role === "USER") return <UserDashboard session={session} refreshSession={refreshSession} />;
  if (session.user.role === "MENTOR") return <MentorDashboard session={session} />;
  return <AdminDashboard session={session} />;
}

export default function App() {
  const { session, saveSession, clearSession } = useAuth();

  return (
    <Shell session={session} onLogout={clearSession}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/user" element={<LoginPage role="USER" onLogin={saveSession} session={session} />} />
        <Route path="/login/mentor" element={<LoginPage role="MENTOR" onLogin={saveSession} session={session} />} />
        <Route path="/login/admin" element={<LoginPage role="ADMIN" onLogin={saveSession} session={session} />} />
        <Route path="/dashboard" element={<ProtectedDashboard session={session} refreshSession={saveSession} />} />
      </Routes>
    </Shell>
  );
}
