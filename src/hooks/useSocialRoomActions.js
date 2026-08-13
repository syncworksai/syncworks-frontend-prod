import { useState } from "react";
import api from "../api/client";

export default function useSocialRoomActions() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createEntry(values) {
    setSaving(true);
    setError("");
    try {
      const response = await api.request({ method: "POST", url: "/social/room-feed/", data: values });
      return response.data;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to publish to this room.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function reviseEntry(id, text) {
    setSaving(true);
    setError("");
    try {
      const response = await api.request({ method: "PATCH", url: `/social/room-feed/${id}/`, data: { body: text } });
      return response.data;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to update this room entry.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, createEntry, reviseEntry };
}
