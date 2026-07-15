import { useState } from "react";
import { STORAGE_KEY } from "../constants";

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState(readSession);

  const saveSession = (next) => {
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const clearSession = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { session, saveSession, clearSession };
}
