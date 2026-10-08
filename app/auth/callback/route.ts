import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RESET_PATH = "/auth/reset-password";

// Lands here from emailed links (sign-up confirmation, password reset).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Same-origin paths only. "/" sends new users to onboarding and returning
  // users to the dashboard.
  const requested = searchParams.get("next") ?? "/";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);

    // The link was opened in a different browser from the one that requested
    // it (or has expired), so no session can be created here.
    if (next === RESET_PATH) {
      return NextResponse.redirect(`${origin}/auth/forgot-password?expired=1`);
    }
    return NextResponse.redirect(`${origin}/auth/login?confirmed=1`);
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
