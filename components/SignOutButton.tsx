"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button type="button" className="icon-btn" onClick={signOut}>
      Sign out
    </button>
  );
}
