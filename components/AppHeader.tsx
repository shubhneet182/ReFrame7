import Link from "next/link";
import { CloudMascot } from "@/components/CloudMascot";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  /** Replaces the mascot on the right. */
  actions?: React.ReactNode;
}

export function AppHeader({ title, subtitle, backHref, actions }: AppHeaderProps) {
  return (
    <header className="app-header">
      {backHref && (
        <Link href={backHref} className="header-back" aria-label="Back">
          ‹
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="app-name truncate">{title}</h1>
        {subtitle && <p className="header-sub truncate">{subtitle}</p>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {actions ?? <CloudMascot />}
      </div>
    </header>
  );
}
