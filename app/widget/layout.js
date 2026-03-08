import "@/app/globals.css";

export const metadata = {
  title: "Term Countdown · PrimaryAI",
  description: "Live term countdown for primary school teachers",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Term Clock",
  },
};

export default function WidgetLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0f172a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';var p=localStorage.getItem('palette')||'slate';document.documentElement.dataset.theme=t;document.documentElement.dataset.palette=p;}catch(e){}})()`,
          }}
        />
      </head>
      <body style={{ margin: 0, minHeight: "100dvh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </body>
    </html>
  );
}
