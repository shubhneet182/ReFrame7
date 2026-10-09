import { redirect } from "next/navigation";
import { CloudMascot } from "@/components/CloudMascot";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "ReFrame7" };

export default async function OnboardingPage() {
  const { user, accepted } = await getViewer();

  // Shown once, until the notice is accepted.
  if (accepted) redirect("/dashboard");

  return (
    <main className="content narrow flex flex-col justify-center">
      <div className="mb-4 flex justify-center">
        <CloudMascot size={64} />
      </div>

      <div className="consent-card">
        <h1 className="mb-3 text-base font-semibold text-blue">How ReFrame7 handles your data</h1>
        <ul className="space-y-3 text-sm leading-relaxed text-text2">
          <li>
            <strong className="font-medium text-text">Without an account.</strong> You can use
            ReFrame7 without signing in. Your thought records stay in this browser and are cleared
            when you close the tab.
          </li>
          <li>
            <strong className="font-medium text-text">With a free account.</strong> Your records
            are securely saved to your account. Only you can see them, and they&apos;ll be there
            whenever you come back, on any device.
          </li>
          <li>
            <strong className="font-medium text-text">AI suggestions.</strong> AI helps turn your
            thoughts into useful reflections and insights throughout the app. When AI is used,
            you&apos;re in control of what you choose to write and share. Your entries are not used
            to train the AI.
          </li>
          <li>
            <strong className="font-medium text-text">Your identity.</strong> Sensitive
            information like your name or email stays separate from AI and is never shared with
            it.
          </li>
        </ul>
      </div>

      <p className="mb-4 px-0.5 text-xs leading-relaxed text-text3">
        Every AI suggestion is clearly labelled, and you are always in control. You can edit,
        accept, or ignore any suggestion.
      </p>

      <OnboardingForm signedIn={Boolean(user)} />
    </main>
  );
}
