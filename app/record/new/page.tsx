import { redirect } from "next/navigation";
import { RecordFlow } from "@/components/RecordFlow";
import { createClient } from "@/lib/supabase/server";
import type { ThoughtRecord, UserPreferences } from "@/types";

export const metadata = { title: "New thought record — ReFrame7" };

export default async function NewRecordPage({
  searchParams,
}: {
  searchParams: { resume?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const preferences = user.user_metadata as UserPreferences;
  if (!preferences.privacy_accepted) redirect("/onboarding");

  let initialRecord: ThoughtRecord | undefined;
  if (searchParams.resume) {
    const { data } = await supabase
      .from("thought_records")
      .select("*")
      .eq("id", searchParams.resume)
      .eq("is_complete", false)
      .maybeSingle<ThoughtRecord>();
    if (!data) redirect("/dashboard");
    initialRecord = data;
  }

  return (
    <RecordFlow
      userId={user.id}
      aiEnabled={preferences.ai_enabled === true}
      initialRecord={initialRecord}
    />
  );
}
