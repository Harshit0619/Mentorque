import { StatsStrip } from "../components/shared/StatsStrip";
import { AvailabilityGrid } from "../components/availability/AvailabilityGrid";
import { DarkMeetingsView } from "../components/shared/DarkMeetingsView";
import { useMeetings } from "../hooks/useMeetings";
import { useState } from "react";

export function MentorDashboard({ session }) {
  const [tab, setTab] = useState("availability");
  const { meetings } = useMeetings(session.token, session.user);

  return (
    <main className="dashboard dashboard-dark-page">
      <StatsStrip
        items={[
          { label: "Role", value: "Mentor", helper: "Can edit availability only" },
          { label: "Metadata", value: "Admin managed", helper: "Tags and description stay consistent" },
          { label: "Booking", value: "Admin-led", helper: "Calls are scheduled by admin" },
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
          </div>
        </div>
        {tab === "availability" && (
          <>
            <p className="eyebrow">Mentor availability</p>
            <h2>Mentors only manage availability in this flow.</h2>
            <p className="muted-light">Mentor tags and descriptions stay under admin control so recommendations remain consistent.</p>
            <AvailabilityGrid session={session} />
          </>
        )}
        {tab === "bookings" && <DarkMeetingsView meetings={meetings} emptyTitle="No mentor bookings yet" emptyBody="Meetings assigned to you will show up here." />}
      </section>
    </main>
  );
}
