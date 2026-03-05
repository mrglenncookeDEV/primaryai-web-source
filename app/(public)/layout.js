import FooterLinks from "@/components/marketing/FooterLinks";

export default function PublicLayout({ children }) {
  return (
    <>
      {children}
      <FooterLinks />
    </>
  );
}
