import Nav from "@/components/marketing/Nav";
import FooterLinks from "@/components/marketing/FooterLinks";
import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import CommandPalette from "@/components/CommandPalette";
import ScrollToTop from "@/components/ScrollToTop";

export default function AppLayout({ children }) {
  return (
    <>
      <ScrollToTop />
      <Nav showBackButton />
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
