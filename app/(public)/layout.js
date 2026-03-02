// Force all public pages to be dynamically rendered so getAuthSession()
// always reads the live cookie (green/red LED in Nav reflects actual login state).
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }) {
  return children;
}
