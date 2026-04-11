import { useEffect, useState } from "react";

const COLLECTOR_STORAGE_KEY = "popup_fresh_collector_id";

function buildCollectorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `guest-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateGuestCollectorId() {
  if (typeof window === "undefined") {
    return "guest-local";
  }

  const existing = window.localStorage.getItem(COLLECTOR_STORAGE_KEY);
  if (existing && existing.trim()) {
    return existing.trim().toLowerCase();
  }

  const next = buildCollectorId().toLowerCase();
  window.localStorage.setItem(COLLECTOR_STORAGE_KEY, next);
  return next;
}

export function useGuestCollector() {
  const [collectorId, setCollectorId] = useState<string>("guest-local");

  useEffect(() => {
    setCollectorId(getOrCreateGuestCollectorId());
  }, []);

  return collectorId;
}
