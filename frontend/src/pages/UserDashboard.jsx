import { useState } from "react";
import { api } from "../services/api";
import { StatsStrip } from "../components/shared/StatsStrip";
import { AvailabilityGrid } from "../components/availability/AvailabilityGrid";
import { MeetingsPanel } from "../components/shared/MeetingsPanel";

export function UserDashboard({ session, refreshSession }) {
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
