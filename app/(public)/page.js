import Nav from "@/components/marketing/Nav";
import LandingHero from "@/components/marketing/LandingHero";
import LandingRightPanel from "@/components/marketing/LandingRightPanel";
import VideoBackground from "@/components/marketing/VideoBackground";

export default function LandingPage() {
  return (
    <main className="page-wrap landing-page-wrap">
      <VideoBackground className="landing-video-bg" src="/Flow_202604210959.mp4" />
      <Nav />
      <div className="landing-split">
        <div className="landing-split-left landing-main-content">
          <LandingHero />
        </div>
        <LandingRightPanel />
      </div>
    </main>
  );
}
