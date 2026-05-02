const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1350;

function LogoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15,0.7,-0.15,1,0 L21.5,7.5" stroke="#ef8f45" strokeWidth="1.7" />
      <path d="M19.5,12 v6.5 c0,1.1,-0.9,2,-2,2 h-11 c-1.1,0,-2,-0.9,-2,-2 V12" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19.5,12 C17.5,10.2,14.5,10.2,12,12" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12,12.2 v8.1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12,12 C9.5,10.2,6.5,10.2,4.5,12" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default function LinkedInSurveyPreviewPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        overflow: "auto",
        padding: "24px",
        background: "#dfe9f7",
      }}
    >
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          overflow: "hidden",
          position: "relative",
          margin: "0 auto",
          background:
            "radial-gradient(circle at 18% 12%, rgba(138, 171, 214, 0.22), transparent 28%), radial-gradient(circle at 82% 18%, rgba(239, 143, 69, 0.15), transparent 24%), linear-gradient(180deg, #eef4fb 0%, #dfe9f7 100%)",
          color: "#16304d",
          fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 70px rgba(29, 53, 82, 0.14)",
        }}
      >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.38) 0%, transparent 26%, transparent 74%, rgba(255,255,255,0.28) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 86,
          right: 78,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(181, 200, 232, 0.42) 0%, rgba(181, 200, 232, 0.08) 55%, transparent 74%)",
          filter: "blur(6px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 240,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(239, 143, 69, 0.18) 0%, rgba(239, 143, 69, 0.06) 55%, transparent 76%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <section
        style={{
          padding: "72px 78px 0",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 999,
            border: "1px solid rgba(58, 95, 138, 0.18)",
            background: "rgba(255, 255, 255, 0.64)",
            boxShadow: "0 18px 40px rgba(41, 67, 100, 0.08)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <LogoMark />
          <span
            style={{
              fontFamily: '"Avenir Next Condensed", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Arial Narrow", sans-serif',
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            PrimaryAI Survey
          </span>
        </div>

        <div style={{ marginTop: 44, maxWidth: 940 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 74,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              fontWeight: 400,
              color: "#213f63",
              fontFamily: '"Avenir Next Condensed", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Arial Narrow", sans-serif',
            }}
          >
            Shaping AI
            <br />
            for primary education
          </h1>
          <p
            style={{
              margin: "24px 0 0",
              fontSize: 30,
              lineHeight: 1.35,
              color: "#4f6786",
              maxWidth: 800,
              fontWeight: 400,
              fontFamily: '"Avenir Next Condensed", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Arial Narrow", sans-serif',
            }}
          >
            Share your perspective across Early Years, KS1 and KS2.
            Help shape a platform built to reduce workload and improve planning.
          </p>
        </div>
      </section>

      <section
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 70px 0",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 960,
            height: 680,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 820,
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                aspectRatio: "16 / 10",
                background: "linear-gradient(to bottom, #8b95a7, #566173 58%, #2e3746)",
                borderRadius: "24px 24px 0 0",
                padding: "1.1%",
                borderTop: "1px solid rgba(255,255,255,0.36)",
                boxShadow: "0 42px 92px -38px rgba(0, 0, 0, 0.58)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#07090f",
                  border: "10px solid #0a0a0a",
                  boxShadow: "inset 0 0 24px rgba(0, 0, 0, 0.75)",
                }}
              >
                <img
                  src="/images/landing/dashboard-final.png"
                  alt="PrimaryAI desktop dashboard preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center top",
                    display: "block",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "116%",
                height: 34,
                marginLeft: "-8%",
                borderRadius: "0 0 56px 56px",
                background: "linear-gradient(to bottom, #4c5668, #2f3542 45%, #171c28)",
                borderTop: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 30px 70px -20px rgba(0, 0, 0, 0.56)",
              }}
            >
              <div
                style={{
                  width: "23%",
                  height: 11,
                  margin: "0 auto",
                  borderRadius: "0 0 28px 28px",
                  background: "rgba(5, 8, 14, 0.54)",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              />
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 78,
              bottom: 168,
              width: 270,
              height: 270,
              pointerEvents: "none",
              opacity: 0.95,
              zIndex: 1,
              filter: "blur(12px)",
              background:
                "radial-gradient(circle at 36% 66%, rgba(255,255,255,0.98) 0%, rgba(240,250,255,0.94) 7%, rgba(198,230,255,0.62) 18%, rgba(122,194,255,0.34) 40%, transparent 76%), radial-gradient(circle at 42% 62%, rgba(167,219,255,0.34) 0%, transparent 56%)",
              mixBlendMode: "screen",
            }}
          />

          <div
            style={{
              position: "absolute",
              right: 112,
              bottom: 48,
              zIndex: 3,
              width: 182,
              aspectRatio: "9 / 19.2",
              padding: 9,
              borderRadius: 40,
              border: "5px solid #0d1320",
              background: "#04050a",
              boxShadow: "0 40px 76px -28px rgba(0, 0, 0, 0.72)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 86,
                height: 14,
                background: "#0d1320",
                borderRadius: "0 0 20px 20px",
                zIndex: 2,
              }}
            />
            <div
              style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                borderRadius: 30,
                background: "#05070c",
              }}
            >
              <img
                src="/images/landing/home-final-24s.png"
                alt="PrimaryAI mobile preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <footer
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          padding: "0 78px 74px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 20px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.68)",
              border: "1px solid rgba(58, 95, 138, 0.16)",
              boxShadow: "0 18px 40px rgba(41, 67, 100, 0.08)",
            }}
          >
            <span
              style={{
                width: 11,
                height: 11,
                borderRadius: 999,
                background: "#22c55e",
                boxShadow: "0 0 0 6px rgba(34, 197, 94, 0.12)",
              }}
            />
            <span
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "#2c4d76",
                fontFamily: '"Avenir Next Condensed", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Arial Narrow", sans-serif',
                letterSpacing: "-0.01em",
              }}
            >
              Complete the educator survey
            </span>
          </div>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 22,
              color: "#5f7695",
              fontWeight: 400,
              fontFamily: '"Avenir Next Condensed", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Arial Narrow", sans-serif',
            }}
          >
            Teachers, leaders and primary education professionals invited
          </p>
        </div>

        <div
          style={{
            textAlign: "right",
            color: "#59708e",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Survey
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 500,
              color: "#2c4d76",
              letterSpacing: "-0.02em",
              fontFamily: '"Avenir Next Condensed", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Arial Narrow", sans-serif',
            }}
          >
            primaryai.co.uk/survey
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}
