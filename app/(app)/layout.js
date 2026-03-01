import Nav from "@/components/marketing/Nav";

export default function AppLayout({ children }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
