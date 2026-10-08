import { redirect } from "next/navigation";
import { CloudMascot } from "@/components/CloudMascot";
import { OnboardingForm } from "@/components/OnboardingForm";
import { createClient } from "@/lib/supabase/server";
import type { UserPreferences } from "@/types";

export const metadata = { title: "Your data — ReFrame7" };

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  // Shown once, until the notice is accepted.
  if ((user.user_metadata as UserPreferences).privacy_accepted) redirect("/dashboard");

  return (
    <main className="content flex flex-col justify-center">
      <div className="mb-4 flex justify-center">
        <CloudMascot size={64} />
      </div>

      <div className="consent-card">
        <h1 className="mb-3 text-base font-semibold text-blue">How ReFrame7 handles your data</h1>
        <ul className="space-y-3 text-sm leading-relaxed text-text2">
          <li>
            <strong className="font-medium text-text">Your records.</strong> Your thought records
            are stored securely in your account and are only visible to you.
          </li>
          <li>
            <strong className="font-medium text-text">AI suggestions.</strong> The text of your
            record is sent to Claude to generate suggestions. Claude does not train on your
            entries.
          </li>
          <li>
            <strong className="font-medium text-text">Your identity.</strong> Account details such
            as your name and email are never sent to AI.
          </li>
        </ul>
      </div>

      <p className="mb-4 px-0.5 text-xs leading-relaxed text-text3">
        Every AI suggestion is clearly labelled, and you are always in control. You can edit,
        accept, or ignore any suggestion.
      </p>

      <OnboardingForm />
    </main>
  );
}
