import { useCallback, useState } from "react";
import api from "../api/client";

const normalize = (data) => Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);

export default function useSocialRoomFeed() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async (group, event = "none") => {
    if (!group) return [];
    try {
      const response = await api.get("/social/room-feed/", { params: { group, event } });
      const next = normalize(response.data);
      setItems(next);
      setError("");
      return next;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to load this room.");
      return [];
    }
  }, []);

  return { items, error, load };
}
