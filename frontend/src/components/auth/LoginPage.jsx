import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

export function LoginPage({ role, onLogin, session }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(role === "ADMIN" ? "admin@mentorque.com" : "");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.role === role) {
      navigate("/dashboard");
    }
  }, [navigate, role, session]);

  const title = {
    USER: "User login",
    MENTOR: "Mentor login",
    ADMIN: "Admin login",
  }[role];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: { email, password, role },
      });
      onLogin(result);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="panel-wrap">
      <form className="panel" onSubmit={handleSubmit}>
        <p className="eyebrow">{title}</p>
        <h2>Use the seeded credentials to explore the role-specific flow.</h2>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
