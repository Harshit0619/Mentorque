import { Link } from "react-router-dom";

function RoleCard({ title, description, to }) {
  return (
    <Link className="role-card" to={to}>
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
  );
}

export function Landing() {
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
