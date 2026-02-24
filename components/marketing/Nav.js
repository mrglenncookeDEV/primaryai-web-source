import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/features", label: "Features" },
  { href: "/faq", label: "FAQ" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/dashboard", label: "Dashboard" },
];

export default async function Nav() {
  const session = await getAuthSession();
  return (
    <nav className="top-nav" aria-label="Site navigation">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="chip">
          {link.label}
        </Link>
      ))}
      {!session ? (
        <>
          <Link href="/login" className="chip">
            Login
          </Link>
          <Link href="/signup" className="chip">
            Sign Up
          </Link>
        </>
      ) : (
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="chip">
            Logout
          </button>
        </form>
      )}
    </nav>
  );
}
