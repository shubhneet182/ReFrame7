"use client";

import { useEffect, useState } from "react";
import type { ThoughtRecord } from "@/types";

// Guests have no account, so their records live in sessionStorage: they
// survive reloads in the same tab and are cleared when the tab closes.
const KEY = "rf7_records";

export const GUEST_USER_ID = "guest";

export function loadGuestRecords(): ThoughtRecord[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ThoughtRecord[]) : [];
  } catch {
    return [];
  }
}

function store(records: ThoughtRecord[]): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

/** Inserts or replaces by id, keeping newest first. Returns false if storage is unavailable. */
export function saveGuestRecord(record: ThoughtRecord): boolean {
  const others = loadGuestRecords().filter((r) => r.id !== record.id);
  return store(
    [record, ...others].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );
}

export function getGuestRecord(id: string): ThoughtRecord | undefined {
  return loadGuestRecords().find((r) => r.id === id);
}

export function deleteGuestRecord(id: string): boolean {
  return store(loadGuestRecords().filter((r) => r.id !== id));
}

export function clearGuestRecords() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * The records to show: the server's (signed-in) or this session's (guest).
 * `ready` is false until the guest's session has been read.
 */
export function useRecords(serverRecords: ThoughtRecord[] | null) {
  const [guestRecords, setGuestRecords] = useState<ThoughtRecord[] | null>(null);

  useEffect(() => {
    if (serverRecords === null) setGuestRecords(loadGuestRecords());
  }, [serverRecords]);

  if (serverRecords !== null) return { records: serverRecords, ready: true };
  return { records: guestRecords ?? [], ready: guestRecords !== null };
}
