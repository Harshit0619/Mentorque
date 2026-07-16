import { useState } from "react";
import { api } from "../services/api";
import { StatsStrip } from "../components/shared/StatsStrip";
import { AvailabilityGrid } from "../components/availability/AvailabilityGrid";
import { DarkMeetingsView } from "../components/shared/DarkMeetingsView";
import { useMeetings } from "../hooks/useMeetings";

export function UserDashboard({ session, refreshSession }) {
  const [form, setForm] = useState({
    name: session.user.name,
    timezone: session.user.timezone,
    description: session.user.description || "",
    tags: Array.isArray(session.user.tags) ? session.user.tags.join(", ") : "",
  });
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("availability");
  const { meetings } = useMeetings(session.token, session.user);

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
    <main className="dashboard dashboard-dark-page">
      <StatsStrip
        items={[
          { label: "Role", value: "User", helper: "Can edit requirements and availability" },
          { label: "Tags", value: Array.isArray(session.user.tags) ? session.user.tags.length : 0, helper: "Used for mentor matching" },
          { label: "Booking", value: "Admin-led", helper: "Users cannot book directly" },
        ]}
      />
      <section className="dark-panel">
        <div className="tab-header">
          <div className="tab-group">
            <button type="button" className={`tab-pill ${tab === "availability" ? "tab-pill-active" : ""}`} onClick={() => setTab("availability")}>
              Availability
            </button>
            <button type="button" className={`tab-pill ${tab === "bookings" ? "tab-pill-active" : ""}`} onClick={() => setTab("bookings")}>
              Bookings
            </button>
            <button type="button" className={`tab-pill ${tab === "requirements" ? "tab-pill-active" : ""}`} onClick={() => setTab("requirements")}>
              Requirements
            </button>
          </div>
        </div>

        {tab === "requirements" && (
          <form className="dark-editor" onSubmit={saveProfile}>
            <p className="eyebrow">User requirements</p>
            <h2>Describe what kind of help you need before admin starts matching.</h2>
            <label className="dark-field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="dark-field">Timezone<input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label>
            <label className="dark-field">Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="tech, good_communication" /></label>
            <label className="dark-field">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} /></label>
            <button type="submit" className="primary-schedule-button">Save requirements</button>
            {message && <p className="muted-light">{message}</p>}
          </form>
        )}

        {tab === "availability" && <AvailabilityGrid session={session} />}
        {tab === "bookings" && <DarkMeetingsView meetings={meetings} emptyTitle="No upcoming bookings" emptyBody="Scheduled mentoring calls will appear here once admin books them." />}
      </section>
    </main>
  );
}
