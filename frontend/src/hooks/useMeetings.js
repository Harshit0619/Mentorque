import { useEffect, useState } from "react";
import { api } from "../services/api";

export function useMeetings(token, user) {
  const [meetings, setMeetings] = useState([]);

  async function reloadMeetings() {
    const query = user?.role === "ADMIN" && user?.id
      ? `/api/meetings?adminId=${user.id}`
      : "/api/meetings";
    api(query, { token }).then(setMeetings).catch(() => setMeetings([]));
  }

  useEffect(() => {
    reloadMeetings();
  }, [token, user?.id, user?.role]);

  return { meetings, reloadMeetings };
}
