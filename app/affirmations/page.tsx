import { redirect } from "next/navigation";
import { AffirmationsView } from "@/components/AffirmationsView";
import { getViewer } from "@/lib/viewer";
import type { ThoughtRecord } from "@/types";

export const metadata = { title: "Affirmations — ReFrame7" };

export default async function AffirmationsPage() {
  const { user, supabase, accepted } = await getViewer();
  if (!accepted) redirect("/onboarding");

  if (!user) return <AffirmationsView signedIn={false} serverRecords={null} loadError={false} />;

  const { data, error } = await supabase
    .from("thought_records")
    .select("*")
    .eq("is_complete", true)
    .order("created_at", { ascending: false })
    .returns<ThoughtRecord[]>();

  if (error) console.error("[affirmations] Failed to load thought_records:", error.message);

  return <AffirmationsView signedIn serverRecords={data ?? []} loadError={Boolean(error)} />;
}
