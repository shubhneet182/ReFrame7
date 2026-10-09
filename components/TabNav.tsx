"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg {...icon}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/record/new",
    label: "Record",
    icon: (
      <svg {...icon}>
        <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
        <path d="M14.5 6.5l3 3" />
      </svg>
    ),
  },
  {
    href: "/affirmations",
    label: "Affirm",
    icon: (
      <svg {...icon}>
        <path d="M12 20s-7-4.4-7-9.6A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.4C19 15.6 12 20 12 20z" />
      </svg>
    ),
  },
  {
    href: "/trends",
    label: "Trends",
    icon: (
      <svg {...icon}>
        <path d="M4 17l5.5-5.5 3.5 3.5L20 8" />
        <path d="M15 8h5v5" />
      </svg>
    ),
  },
];

/**
 * The main tabs. "bottom" is the fixed bar on phones; "top" sits in the page
 * header from tablet width up. CSS shows one or the other.
 */
export function TabNav({ placement = "bottom" }: { placement?: "bottom" | "top" }) {
  const pathname = usePathname();

  return (
    <nav className={placement === "top" ? "tab-nav-top" : "tab-nav"} aria-label="Main">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-item ${active ? "on" : ""}`}
            data-tour={`tab-${tab.label.toLowerCase()}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
