import { useMemo, useState } from "react";

function filterMeetings(meetings, tab) {
  const now = Date.now();
  if (tab === "past") return meetings.filter((meeting) => new Date(meeting.endTime).getTime() < now);
  return meetings.filter((meeting) => new Date(meeting.endTime).getTime() >= now);
}

export function DarkMeetingsView({ meetings, emptyTitle = "No meetings yet", emptyBody = "Scheduled events will appear here.", canDelete = false, onDelete }) {
  const [tab, setTab] = useState("upcoming");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const filtered = useMemo(() => filterMeetings(meetings, tab), [meetings, tab]);

  async function handleDelete() {
    if (!selectedMeeting || !onDelete) return;
    await onDelete(selectedMeeting.id);
    setSelectedMeeting(null);
  }

  return (
    <>
      <section className="dark-panel">
        <div className="tab-header">
          <div className="tab-group">
            <button type="button" className={`tab-pill ${tab === "upcoming" ? "tab-pill-active" : ""}`} onClick={() => setTab("upcoming")}>
              Upcoming
            </button>
            <button type="button" className={`tab-pill ${tab === "past" ? "tab-pill-active" : ""}`} onClick={() => setTab("past")}>
              Past
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-dark-state">
            <strong>{emptyTitle}</strong>
            <p>{emptyBody}</p>
          </div>
        ) : (
          <div className="booking-list">
            {filtered.map((meeting) => (
              <button key={meeting.id} type="button" className="booking-row booking-row-button" onClick={() => setSelectedMeeting(meeting)}>
                <div>
                  <strong>{meeting.title}</strong>
                  <p>{meeting.callType?.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <strong>{new Date(meeting.startTime).toLocaleDateString()}</strong>
                  <p>{new Date(meeting.startTime).toLocaleTimeString()} - {new Date(meeting.endTime).toLocaleTimeString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedMeeting && (
        <div className="meeting-modal-backdrop" onClick={() => setSelectedMeeting(null)}>
          <div className="meeting-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{selectedMeeting.title}</h3>
            <p>{new Date(selectedMeeting.startTime).toLocaleDateString()} | {new Date(selectedMeeting.startTime).toLocaleTimeString()} - {new Date(selectedMeeting.endTime).toLocaleTimeString()}</p>
            <div className="meeting-modal-section">
              <strong>Attendees</strong>
              {(selectedMeeting.participants || []).map((participant) => <span key={participant.id || participant.email}>{participant.email}</span>)}
            </div>
            <div className="meeting-modal-section">
              <strong>Notes</strong>
              <span>{selectedMeeting.notes || "No notes added."}</span>
            </div>
            <div className="meeting-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setSelectedMeeting(null)}>Close</button>
              {canDelete && <button type="button" className="danger-button" onClick={handleDelete}>Delete</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
