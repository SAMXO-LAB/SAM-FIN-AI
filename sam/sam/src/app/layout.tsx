import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: { default: "Finance Book AI · Your money, beautifully understood", template: "%s · Finance Book AI" },
  description: "One intelligent place for your spending, savings, loans, goals and financial future.",
  applicationName: "Finance Book AI",
  appleWebApp: { capable: true, title: "Finance Book AI", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8ECF2" },
    { media: "(prefers-color-scheme: dark)", color: "#05060A" },
  ],
};

// Applies the saved theme before first paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('sam.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="ambient" aria-hidden="true">
          <div className="orb o1" /><div className="orb o2" /><div className="orb o3" /><div className="grain" />
        </div>
        <ToastProvider>{children}</ToastProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
