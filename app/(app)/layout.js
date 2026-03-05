import Nav from "@/components/marketing/Nav";
import FooterLinks from "@/components/marketing/FooterLinks";
import AppSidebar from "@/components/AppSidebar";
import CommandPalette from "@/components/CommandPalette";
import { getAuthSession } from "@/lib/auth";

export default async function AppLayout({ children }) {
  const session = await getAuthSession();
  return (
    <>
      <Nav session={session} />
      <CommandPalette />
      <div className="app-body">
        <AppSidebar />
        <div className="app-content">
          {children}
        </div>
      </div>
      <FooterLinks />
    </>
  );
}
