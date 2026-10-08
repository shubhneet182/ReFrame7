import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New password — ReFrame7" };

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only reachable with the session created by the emailed reset link.
  if (!user) redirect("/auth/forgot-password?expired=1");

  return <ResetPasswordForm />;
}
