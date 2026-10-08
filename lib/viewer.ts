import { cookies } from "next/headers";
import { PRIVACY_COOKIE } from "@/lib/privacy";
import { createClient } from "@/lib/supabase/server";
import type { UserPreferences } from "@/types";

/**
 * Who is looking at the page. `user` is null for guests, who use the app
 * without an account and keep their records in the browser session.
 */
export async function getViewer() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const preferences = (user?.user_metadata ?? {}) as UserPreferences;
  const accepted =
    preferences.privacy_accepted === true || cookies().get(PRIVACY_COOKIE)?.value === "1";

  return { user, supabase, preferences, accepted };
}
