import Link from "next/link";
import { CloudMascot } from "@/components/CloudMascot";
import { TabNav } from "@/components/TabNav";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  /** Replaces the mascot on the right. */
  actions?: React.ReactNode;
  /** Show the main tabs in the header on wide screens. */
  tabs?: boolean;
}

export function AppHeader({ title, subtitle, backHref, actions, tabs }: AppHeaderProps) {
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
      {tabs && <TabNav placement="top" />}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {actions ?? <CloudMascot />}
      </div>
    </header>
  );
}
