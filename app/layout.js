import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import BackgroundScene from "@/components/BackgroundScene";
import PageLoader from "@/components/PageLoader";
import AppSidebar from "@/components/AppSidebar";
import { getAuthSession } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata = {
  title: "PrimaryAI",
  description: "AI-powered lesson planning and teaching tools built for primary school educators.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default async function RootLayout({ children }) {
  const session = await getAuthSession();
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        {/* Set theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'light';var p=localStorage.getItem('palette')||'slate';document.documentElement.dataset.theme=t;document.documentElement.dataset.palette=p;}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <BackgroundScene />
        <Suspense>
          <PageLoader />
        </Suspense>
        {session && <AppSidebar mode="global" />}
        {children}
      </body>
    </html>
  );
}
