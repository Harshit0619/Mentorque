const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = import.meta.env.DEV
  ? configuredApiUrl || "http://localhost:5000"
  : configuredApiUrl && !configuredApiUrl.includes("localhost")
    ? configuredApiUrl
    : "/api";

export async function api(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Request failed");
  }
  return payload;
}
