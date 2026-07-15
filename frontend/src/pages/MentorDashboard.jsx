import { StatsStrip } from "../components/shared/StatsStrip";
import { AvailabilityGrid } from "../components/availability/AvailabilityGrid";
import { MeetingsPanel } from "../components/shared/MeetingsPanel";

export function MentorDashboard({ session }) {
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
