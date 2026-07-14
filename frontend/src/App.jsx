import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STORAGE_KEY = "mentorque-session";
const HOURS = Array.from({ length: 12 }, (_, index) => index + 8);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          Mentorque Scheduler
        </Link>
        <nav className="topnav">
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
  });
  const [overlap, setOverlap] = useState(null);
  const [status, setStatus] = useState("");
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const selectedMentor = recommendations.find((mentor) => mentor.id === selectedMentorId)
    || mentors.find((mentor) => mentor.id === selectedMentorId);

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

  async function fetchRecommendations() {
    if (!selectedUserId) return;
    const result = await api(`/api/admin/recommendations/${selectedUserId}?callType=${selectedCallType}`, {
      token: session.token,
    });
    setRecommendations(result.recommendations);
    setSelectedMentorId(result.recommendations[0]?.id || "");
  }

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
      },
    });
    setStatus(`Booked ${result.title}.`);
  }

  return (
    <main className="dashboard admin-grid">
      <StatsStrip
        items={[
          { label: "Users", value: users.length || 10, helper: "Seeded requirement profiles" },
          { label: "Mentors", value: mentors.length || 5, helper: "Admin-curated metadata" },
          { label: "Call type", value: CALL_TYPE_OPTIONS.find((item) => item.value === selectedCallType)?.label || "Resume Revamp", helper: "Affects recommendation scoring" },
        ]}
      />
      <section className="panel">
        <p className="eyebrow">Users</p>
        <h2>Review requirement signals</h2>
        <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
          <option value="">Select a user</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
        <div className="stack">
          {users.map((user) => (
            <article key={user.id} className={`list-card ${selectedUserId === user.id ? "selected" : ""}`}>
              <strong>{user.name}</strong>
              <span>{Array.isArray(user.tags) ? user.tags.join(", ") : ""}</span>
              <span>{user.description}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="row between">
          <div>
            <p className="eyebrow">Mentor metadata</p>
            <h2>Admin-controlled mentor cards</h2>
          </div>
          <button onClick={fetchRecommendations}>Refresh recommendations</button>
        </div>
        <label>
          Call type
          <select value={selectedCallType} onChange={(event) => setSelectedCallType(event.target.value)}>
            {CALL_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="stack">
          {mentors.map((mentor) => (
            <MentorEditor key={mentor.id} mentor={mentor} onSave={saveMentor} />
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Recommendations</p>
        <h2>Ranked mentors for the selected user</h2>
        {selectedUser && (
          <div className="context-banner">
            <strong>{selectedUser.name}</strong>
            <span>{Array.isArray(selectedUser.tags) ? selectedUser.tags.join(", ") : ""}</span>
          </div>
        )}
        <div className="stack">
          {recommendations.length === 0 && <p className="muted">Pick a user and call type, then refresh recommendations.</p>}
          {recommendations.map((mentor) => (
            <label key={mentor.id} className={`list-card radio-card ${selectedMentorId === mentor.id ? "selected" : ""}`}>
              <input type="radio" checked={selectedMentorId === mentor.id} onChange={() => setSelectedMentorId(mentor.id)} />
              <strong>{mentor.name} | score {mentor.recommendation.score}</strong>
              <span>{Array.isArray(mentor.tags) ? mentor.tags.join(", ") : ""}</span>
              <span>{mentor.recommendation.reasons.join(" | ")}</span>
            </label>
          ))}
        </div>
      </section>

      <form className="panel" onSubmit={createBooking}>
        <p className="eyebrow">Book the call</p>
        <h2>Validate overlap and schedule</h2>
        <div className="booking-summary">
          <div>
            <span>User</span>
            <strong>{selectedUser?.name || "Select a user"}</strong>
          </div>
          <div>
            <span>Mentor</span>
            <strong>{selectedMentor?.name || "Select a mentor"}</strong>
          </div>
          <div>
            <span>Call type</span>
            <strong>{CALL_TYPE_OPTIONS.find((item) => item.value === selectedCallType)?.label}</strong>
          </div>
        </div>
        <label>Title<input value={booking.title} onChange={(event) => setBooking({ ...booking, title: event.target.value })} /></label>
        <label>Date<input type="date" value={booking.date} onChange={(event) => setBooking({ ...booking, date: event.target.value })} /></label>
        <div className="row">
          <label>Start hour<select value={booking.startHour} onChange={(event) => setBooking({ ...booking, startHour: event.target.value })}>{HOURS.map((hour) => <option key={hour}>{hour}</option>)}</select></label>
          <label>End hour<select value={booking.endHour} onChange={(event) => setBooking({ ...booking, endHour: event.target.value })}>{HOURS.map((hour) => <option key={hour}>{hour}</option>)}</select></label>
        </div>
        <label>Notes<textarea rows={3} value={booking.notes} onChange={(event) => setBooking({ ...booking, notes: event.target.value })} /></label>
        <div className="row">
          <button type="button" onClick={checkOverlap}>Check overlap</button>
          <button type="submit">Book call</button>
        </div>
        {overlap && <p className={`muted ${overlap.overlap ? "success" : "error"}`}>{overlap.overlap ? "Both sides are available." : "This slot is not open for both participants."}</p>}
        {status && <p className="muted">{status}</p>}
      </form>
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
