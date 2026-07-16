import { Link, useLocation } from "react-router-dom";

export function Shell({ children, session, onLogout }) {
  const location = useLocation();
  const isDarkTheme = !!session && location.pathname === "/dashboard";

  return (
    <div className={`app-shell ${isDarkTheme ? "admin-shell" : ""}`}>
      <header className={`topbar ${isDarkTheme ? "topbar-dark" : ""}`}>
        <Link className="brand" to="/">
          Mentorque Scheduler
        </Link>
        <nav className={`topnav ${isDarkTheme ? "topnav-dark" : ""}`}>
          {!session && <Link to="/">Home</Link>}
          {session && <span>{session.user.name} | {session.user.role}</span>}
          {session && location.pathname !== "/" && <button onClick={onLogout}>Logout</button>}
        </nav>
      </header>
      {children}
    </div>
  );
}
