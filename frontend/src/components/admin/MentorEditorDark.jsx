import { useEffect, useState } from "react";

export function MentorEditorDark({ mentor, onSave }) {
  const [form, setForm] = useState({
    name: mentor.name,
    timezone: mentor.timezone,
    description: mentor.description || "",
    tags: Array.isArray(mentor.tags) ? mentor.tags.join(", ") : "",
  });

  useEffect(() => {
    setForm({
      name: mentor.name,
      timezone: mentor.timezone,
      description: mentor.description || "",
      tags: Array.isArray(mentor.tags) ? mentor.tags.join(", ") : "",
    });
  }, [mentor]);

  return (
    <div className="dark-editor">
      <label className="dark-field">
        <span>Name</span>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      <label className="dark-field">
        <span>Timezone</span>
        <input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
      </label>
      <label className="dark-field">
        <span>Tags</span>
        <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="tech, big_tech, communication" />
      </label>
      <label className="dark-field">
        <span>Description</span>
        <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <button
        type="button"
        className="primary-schedule-button"
        onClick={() =>
          onSave(mentor.id, {
            ...form,
            tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          })
        }
      >
        Save mentor metadata
      </button>
    </div>
  );
}
