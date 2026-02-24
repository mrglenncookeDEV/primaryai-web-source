import "./globals.css";

export const metadata = {
  title: "Primary AI",
  description: "Subscription-first AI SaaS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
