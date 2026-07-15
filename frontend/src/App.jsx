import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Shell } from "./components/layout/Shell";
import { Landing } from "./components/landing/Landing";
import { LoginPage } from "./components/auth/LoginPage";
import { UserDashboard } from "./pages/UserDashboard";
import { MentorDashboard } from "./pages/MentorDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

function ProtectedDashboard({ session, refreshSession }) {
  if (!session) return <Navigate to="/" replace />;
  if (session.user.role === "USER") return <UserDashboard session={session} refreshSession={refreshSession} />;
  if (session.user.role === "MENTOR") return <MentorDashboard session={session} />;
  return <AdminDashboard session={session} />;
}

export default function App() {
  const { session, saveSession, clearSession } = useAuth();

  return (
    <Shell session={session} onLogout={clearSession}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/user" element={<LoginPage role="USER" onLogin={saveSession} session={session} />} />
        <Route path="/login/mentor" element={<LoginPage role="MENTOR" onLogin={saveSession} session={session} />} />
        <Route path="/login/admin" element={<LoginPage role="ADMIN" onLogin={saveSession} session={session} />} />
        <Route path="/dashboard" element={<ProtectedDashboard session={session} refreshSession={saveSession} />} />
      </Routes>
    </Shell>
  );
}
