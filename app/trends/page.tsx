import { redirect } from "next/navigation";
import { TrendsView } from "@/components/TrendsView";
import { TREND_DAYS } from "@/lib/trends";
import { getViewer } from "@/lib/viewer";
import type { ThoughtRecord } from "@/types";

export const metadata = { title: "Mood trends — ReFrame7" };

export default async function TrendsPage() {
  const { user, supabase, accepted } = await getViewer();
  if (!accepted) redirect("/onboarding");

  if (!user) return <TrendsView signedIn={false} serverRecords={null} loadError={false} />;

  const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("thought_records")
    .select("*")
    .eq("is_complete", true)
    .gte("created_at", since)
    .returns<ThoughtRecord[]>();

  if (error) console.error("[trends] Failed to load thought_records:", error.message);

  return <TrendsView signedIn serverRecords={data ?? []} loadError={Boolean(error)} />;
}
