const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = import.meta.env.DEV
  ? configuredApiUrl || "http://localhost:5000"
  : configuredApiUrl && !configuredApiUrl.includes("localhost")
    ? configuredApiUrl
    : "";

export async function api(path, { method = "GET", token, body } = {}) {
  const requestUrl = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${API_URL}${path}`;

  const response = await fetch(requestUrl, {
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
