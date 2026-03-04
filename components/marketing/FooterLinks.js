import Link from "next/link";

export default function FooterLinks() {
  return (
    <footer className="site-footer-links" aria-label="Footer links">
      <Link href="/survey">Share Your Thoughts</Link>
      <span aria-hidden="true">|</span>
      <Link href="/survey-responses">Survey Responses</Link>
    </footer>
  );
}
