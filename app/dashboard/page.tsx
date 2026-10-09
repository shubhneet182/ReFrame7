import { redirect } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";
import { getViewer } from "@/lib/viewer";
import type { ThoughtRecord } from "@/types";

export default async function DashboardPage() {
  const { user, supabase, preferences, accepted } = await getViewer();
  if (!accepted) redirect("/onboarding");

  // Guests have no server-side records; the view reads their session instead.
  if (!user) {
    return <DashboardView userId={null} serverRecords={null} loadError={false} tourSeen={false} />;
  }

  const { data, error } = await supabase
    .from("thought_records")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ThoughtRecord[]>();

  if (error) console.error("[dashboard] Failed to load thought_records:", error.message);

  return (
    <DashboardView
      userId={user.id}
      serverRecords={data ?? []}
      loadError={Boolean(error)}
      tourSeen={preferences.tour_seen === true}
    />
  );
}
