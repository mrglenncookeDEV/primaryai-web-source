import Nav from "@/components/marketing/Nav";
import FooterLinks from "@/components/marketing/FooterLinks";

export default function AppLayout({ children }) {
  return (
    <>
      <Nav />
      {children}
      <FooterLinks />
    </>
  );
}
