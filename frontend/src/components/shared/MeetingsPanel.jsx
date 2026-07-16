import { useMeetings } from "../../hooks/useMeetings";

export function MeetingsPanel({ session }) {
  const { meetings } = useMeetings(session.token, session.user);

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
