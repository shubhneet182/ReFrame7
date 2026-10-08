import { notFound, redirect } from "next/navigation";
import { RecordView } from "@/components/RecordView";
import { getViewer } from "@/lib/viewer";
import type { SimilarRecord, ThoughtRecord } from "@/types";

export const metadata = { title: "Thought record — ReFrame7" };

export default async function RecordPage({ params }: { params: { id: string } }) {
  const { user, supabase, accepted } = await getViewer();
  if (!accepted) redirect("/onboarding");

  // Guest records exist only in the browser session.
  if (!user) return <RecordView guestId={params.id} />;

  const { data: record } = await supabase
    .from("thought_records")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<ThoughtRecord>();

  if (!record) notFound();

  let similar: SimilarRecord | null = null;
  if (record.similar_record_id) {
    const { data } = await supabase
      .from("thought_records")
      .select("id, created_at, situation, balanced_thought")
      .eq("id", record.similar_record_id)
      .maybeSingle<SimilarRecord>();
    similar = data;
  }

  return <RecordView serverRecord={record} serverSimilar={similar} />;
}
