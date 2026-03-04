import Nav from "@/components/marketing/Nav";

export default function SurveyLayout({ children }) {
  return (
    <div className="survey-route-layout">
      <Nav />
      {children}
    </div>
  );
}
