import Nav from "@/components/marketing/Nav";
import FooterLinks from "@/components/marketing/FooterLinks";
import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileBackButton from "@/components/MobileBackButton";
import CommandPalette from "@/components/CommandPalette";
import ScrollToTop from "@/components/ScrollToTop";
import { getAuthSession } from "@/lib/auth";

export default async function AppLayout({ children }) {
  const session = await getAuthSession();
  return (
    <>
      <ScrollToTop />
      <Nav session={session} />
      <MobileBackButton />
      <CommandPalette />
      <div className="app-body">
        <AppSidebar />
        <div className="app-content">
          {children}
        </div>
      </div>
      <MobileBottomNav />
      <FooterLinks />
    </>
  );
}
