import { Link, useLocation } from "react-router-dom";

export function Shell({ children, session, onLogout }) {
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
