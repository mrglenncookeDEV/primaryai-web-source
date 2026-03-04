export default function AppLoading() {
  return (
    <div className="page-loader page-loader--static" aria-hidden="true">
      <div className="page-loader-inner">
        <svg
          className="page-loader-house"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          shapeRendering="geometricPrecision"
        >
          <path
            className="pl-stroke pl-s1"
            pathLength="1"
            d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5"
          />
          <path
            className="pl-stroke pl-s2"
            pathLength="1"
            d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12"
          />
          <path
            className="pl-stroke pl-s3"
            pathLength="1"
            d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12"
          />
          <path
            className="pl-stroke pl-s4"
            pathLength="1"
            d="M12,12.2 v8.1"
          />
          <path
            className="pl-stroke pl-s5"
            pathLength="1"
            d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12"
          />
        </svg>
        <div className="page-loader-wordmark">
          Primary<span className="page-loader-ai">AI</span>
        </div>
        <div className="page-loader-dots">
          <span className="page-loader-dot" />
          <span className="page-loader-dot" />
          <span className="page-loader-dot" />
        </div>
      </div>
    </div>
  );
}
