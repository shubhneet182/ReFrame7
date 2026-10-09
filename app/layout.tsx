import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Splash } from "@/components/Splash";
import { PRIVACY_COOKIE } from "@/lib/privacy";
import "./globals.css";

// Body text, inputs and UI labels.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

// App name and main headings.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReFrame7",
  description:
    "Your AI-guided CBT Thought Record. Turn unhelpful thought patterns into more balanced perspectives.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "ReFrame7", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#89B4D4",
};

// Runs before paint so the saved theme never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t);if(sessionStorage.getItem("splash"))document.documentElement.setAttribute("data-splash","seen")}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The welcome screen is for first-time visitors: once the data-handling
  // notice has been accepted, the app opens straight to the home screen.
  const firstVisit = cookies().get(PRIVACY_COOKIE)?.value !== "1";

  return (
    <html lang="en" data-theme="dark" className={`${dmSans.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {firstVisit && <Splash />}
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
