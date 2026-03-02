import "./globals.css";
import BackgroundScene from "@/components/BackgroundScene";

export const metadata = {
  title: "Primary AI",
  description: "AI-powered lesson planning and teaching tools built for primary school educators.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';var p=localStorage.getItem('palette')||'duck-egg';document.documentElement.dataset.theme=t;document.documentElement.dataset.palette=p;}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <BackgroundScene />
        {children}
      </body>
    </html>
  );
}
