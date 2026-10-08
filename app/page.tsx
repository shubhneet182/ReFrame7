import { redirect } from "next/navigation";

// No sign-in wall: everyone lands on the home screen (which shows the
// data-handling notice first if it hasn't been accepted yet).
export default function LandingPage() {
  redirect("/dashboard");
}
