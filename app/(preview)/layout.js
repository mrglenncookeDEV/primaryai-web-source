export default function PreviewLayout({ children }) {
  return (
    <>
      <style>{`
        .bg-scene { display: none !important; }
        .page-loader-wrap { display: none !important; }
        body { overflow: hidden !important; margin: 0; padding: 0; }
      `}</style>
      {children}
    </>
  );
}
