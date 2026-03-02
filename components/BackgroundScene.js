const LogoMark = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeMiterlimit="10"
    aria-hidden="true"
  >
    <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12" stroke="currentColor" strokeWidth="1.7" />
    <path d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12,12.2 v8.1" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export default function BackgroundScene() {
  return (
    <div className="bg-scene" aria-hidden="true">
      <div className="bg-shape bg-shape--1"><LogoMark /></div>
      <div className="bg-shape bg-shape--2"><LogoMark /></div>
      <div className="bg-shape bg-shape--3"><LogoMark /></div>
    </div>
  );
}
