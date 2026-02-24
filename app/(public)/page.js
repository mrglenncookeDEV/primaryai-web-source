import Nav from "@/components/marketing/Nav";
import LandingHero from "@/components/marketing/LandingHero";

export default function LandingPage() {
  return (
    <main className="page-wrap landing-page-wrap">
      <Nav />
      <div className="landing-main-content">
        <LandingHero />
      </div>
    </main>
  );
}
