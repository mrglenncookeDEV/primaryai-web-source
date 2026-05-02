import Nav from "@/components/marketing/Nav";
import ContactClient from "./ContactClient";

export const metadata = {
  title: "Contact | PrimaryAI",
};

export default function ContactPage() {
  return (
    <main className="page-wrap contact-page-wrap">
      <Nav />
      <ContactClient />
    </main>
  );
}
