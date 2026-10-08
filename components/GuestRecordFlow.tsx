"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RecordFlow } from "@/components/RecordFlow";
import { getGuestRecord } from "@/lib/guest-records";
import type { ThoughtRecord } from "@/types";

/** Loads a guest's record from the browser session before opening the flow. */
export function GuestRecordFlow({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<ThoughtRecord | null>(null);

  useEffect(() => {
    const found = getGuestRecord(resumeId);
    if (found) setRecord(found);
    else router.replace("/dashboard");
  }, [resumeId, router]);

  if (!record) return null;
  return <RecordFlow userId={null} initialRecord={record} />;
}
