"use client";

export default function OutroSection() {
  return (
    <div
      id="outro-overlay"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 12,
        background: "var(--bg-primary)",
        opacity: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
          position: "relative",
        }}
        className="px-6 sm:px-8 lg:px-12"
      >
        {/* Decorative top accent line */}
        <div
          style={{
            width: 1,
            height: 48,
            background: "var(--accent-primary)",
            opacity: 0.4,
            marginBottom: "var(--space-8)",
          }}
          className="hidden sm:block"
        />

        {/* Small uppercase label */}
        <span
          style={{
            fontSize: "var(--text-xs)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            lineHeight: "100%",
            marginBottom: "var(--space-6)",
            fontFamily: '"Inter Tight", sans-serif',
            fontWeight: 500,
          }}
        >
          Summer 2026
        </span>

        {/* Main heading — editorial split */}
        <h2
          style={{
            fontFamily: "var(--font-quiche-display), serif",
            fontWeight: 400,
            color: "var(--text-heading)",
            letterSpacing: "-0.04em",
            lineHeight: "110%",
          }}
          className="text-[38px] sm:text-[68px] lg:text-[96px]"
        >
          <span style={{ display: "block" }}>Explore the</span>
          <span
            style={{
              display: "block",
              color: "var(--text-accent)",
            }}
          >
            Collection
          </span>
        </h2>

        {/* Decorative divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            margin: "var(--space-8) 0",
          }}
          className="sm:my-10 lg:my-12"
        >
          <div
            style={{
              height: 1,
              background: "var(--border-subtle)",
            }}
            className="w-8 sm:w-16 lg:w-24"
          />
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "var(--radius-pill)",
              background: "var(--accent-primary)",
              opacity: 0.6,
            }}
          />
          <div
            style={{
              height: 1,
              background: "var(--border-subtle)",
            }}
            className="w-8 sm:w-16 lg:w-24"
          />
        </div>

        {/* Subtitle */}
        <p
          style={{
            color: "var(--text-secondary)",
            letterSpacing: "-0.02em",
            lineHeight: "180%",
            fontFamily: '"Inter Tight", sans-serif',
            fontWeight: 500,
          }}
          className="text-[12px] sm:text-[14px] lg:text-[15px] max-w-[280px] sm:max-w-[400px] lg:max-w-[440px]"
        >
          Curated outfits crafted with heritage artisanship
          <br />
          — where every thread tells a story.
        </p>

        {/* Decorative bottom accent line */}
        <div
          style={{
            width: 1,
            height: 48,
            background: "var(--accent-primary)",
            opacity: 0.4,
            marginTop: "var(--space-8)",
          }}
          className="hidden sm:block"
        />
      </div>
    </div>
  );
}
