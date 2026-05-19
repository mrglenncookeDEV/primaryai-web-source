export const runtime = 'edge';

import { cookies } from "next/headers";
import Nav from "@/components/marketing/Nav";
import FooterLinks from "@/components/marketing/FooterLinks";
import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import CommandPalette from "@/components/CommandPalette";
import ScrollToTop from "@/components/ScrollToTop";

export default async function AppLayout({ children }) {
  const cookieStore = await cookies();
  const profileComplete = cookieStore.get("pa_profile_complete")?.value === "1";

  return (
    <>
      <ScrollToTop />
      <Nav showBackButton />
      <CommandPalette />
      <div className="app-body">
        {profileComplete && <AppSidebar />}
        <div className="app-content">
          {children}
        </div>
      </div>
      {profileComplete && <MobileBottomNav />}
      <FooterLinks />
    </>
  );
}
