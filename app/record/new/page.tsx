import { redirect } from "next/navigation";
import { GuestRecordFlow } from "@/components/GuestRecordFlow";
import { RecordFlow } from "@/components/RecordFlow";
import { getViewer } from "@/lib/viewer";
import type { ThoughtRecord } from "@/types";

export const metadata = { title: "Thought record — ReFrame7" };

export default async function NewRecordPage({
  searchParams,
}: {
  /** `resume` continues an in-progress record or edits a completed one. */
  searchParams: { resume?: string };
}) {
  const { user, supabase, accepted } = await getViewer();
  if (!accepted) redirect("/onboarding");

  const resumeId = searchParams.resume;

  if (!user) {
    return resumeId ? <GuestRecordFlow resumeId={resumeId} /> : <RecordFlow userId={null} />;
  }

  let initialRecord: ThoughtRecord | undefined;
  if (resumeId) {
    const { data } = await supabase
      .from("thought_records")
      .select("*")
      .eq("id", resumeId)
      .maybeSingle<ThoughtRecord>();
    if (!data) redirect("/dashboard");
    initialRecord = data;
  }

  return <RecordFlow userId={user.id} initialRecord={initialRecord} />;
}
