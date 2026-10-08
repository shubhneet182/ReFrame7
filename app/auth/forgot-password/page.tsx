import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Reset password — ReFrame7" };

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { expired?: string };
}) {
  return (
    <ForgotPasswordForm
      initialError={
        searchParams.expired
          ? "That reset link has expired or was opened in a different browser. Request a new one."
          : undefined
      }
    />
  );
}
