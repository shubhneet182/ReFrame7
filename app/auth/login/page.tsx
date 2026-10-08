import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in — ReFrame7" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { confirmed?: string };
}) {
  return (
    <AuthForm
      mode="login"
      initialNotice={
        searchParams.confirmed ? "Your email is confirmed. Sign in to continue." : undefined
      }
    />
  );
}
